import { IResolvers } from "@graphql-tools/utils";
import { Request } from "express";
import { ObjectId } from "mongodb";
import { Stripe } from "../../../lib/api";
import { Booking, BookingsIndex, Database, Listing } from "../../../lib/types";
import { authorize } from "../../../lib/utils";
import { CreateBookingArgs } from "./types";

const MILISECONDS_IN_A_DAY = 86400000; // 24h * 60m * 60s * 1000ms

const resolveBookingsIndex = (
  bookingsIndex: BookingsIndex,
  checkInDate: string,
  checkOutDate: string
): BookingsIndex => {
  let dateCursor = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const newBookingsIndex: BookingsIndex = { ...bookingsIndex };

  while (dateCursor <= checkOut) {
    const y = dateCursor.getUTCFullYear();
    const m = dateCursor.getUTCMonth(); // 0 to 11 (0: Jan., ..., 11: Dec.)
    const d = dateCursor.getUTCDate();

    if (!newBookingsIndex[y]) {
      newBookingsIndex[y] = {};
    }

    if (!newBookingsIndex[y][m]) {
      newBookingsIndex[y][m] = {};
    }

    if (!newBookingsIndex[y][m][d]) {
      newBookingsIndex[y][m][d] = true;
    } else {
      throw new Error("selected dates can't overlap dates that have already been booked");
    }

    dateCursor = new Date(dateCursor.getTime() + MILISECONDS_IN_A_DAY);
  }

  return newBookingsIndex;
};

export const bookingResolvers: IResolvers = {
  Booking: {
    id: (booking: Booking): string => {
      return booking._id.toString();
    },
    listing: (booking: Booking, _args: Record<string, unknown>, { db }: { db: Database }): Promise<Listing | null> => {
      return db.listings.findOne({ _id: booking.listing });
    },

    tenant: (booking: Booking, _args: Record<string, unknown>, { db }: { db: Database }) => {
      return db.users.findOne({ _id: booking.tenant });
    },
  },
  Mutation: {
    createBooking: async (
      _root: undefined,
      { input }: CreateBookingArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<Booking> => {
      try {
        const { id, source, checkIn, checkOut } = input;

        // verify a logged in user is making request
        const viewer = await authorize(db, req);
        if (!viewer) {
          throw new Error("viewer cannot be found");
        }

        // find listing document that is being booked
        const listing = await db.listings.findOne({ _id: new ObjectId(id) });
        if (!listing) {
          throw new Error("listing can't be found");
        }

        // check that viewer is NOT booking their own listing
        if (listing.host === viewer._id) {
          throw new Error("viewer can't book own listing");
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        // check that checkOut is NOT before checkIn
        if (checkOutDate < checkInDate) {
          throw new Error("check out date can't be before check in date");
        }

        // create a new bookingsIndex for listing being booked
        const bookingsIndex = resolveBookingsIndex(listing.bookingsIndex, checkIn, checkOut);

        // find host from users collection
        const host = await db.users.findOne({
          _id: listing.host,
        });

        if (!host) {
          throw new Error("the host can't be found");
        }

        if (!host.walletId) {
          throw new Error("the host is not connected with Stripe");
        }

        //  get total price to charge
        // 86400000 => Milliseconds in a Day => 24h * 60m * 60s * 1000ms
        const totalPrice = listing.price * ((checkOutDate.getTime() - checkInDate.getTime()) / MILISECONDS_IN_A_DAY + 1);
        
        // create Stripe charge on behalf of the host
        await Stripe.charge(totalPrice, source, host.walletId);


        // insert a new booking document to bookings collection
        const insertRes = await db.bookings.insertOne({
          _id: new ObjectId(),
          listing: listing._id,
          tenant: viewer._id,
          checkIn,
          checkOut,
        });

         // find inserted booking id
        const insertedBooking = await db.bookings.findOne({ _id: insertRes.insertedId });

        if (!insertedBooking) {
          throw new Error("Failed to insert booking");
        }

        // update the host user document to increment ("$inc") the `income` field by the totalPrice
        await db.users.updateOne({ _id: host._id }, { $inc: { income: totalPrice } });

        // update the viewer user document to push ("$push") the new booking id to the `bookings` field
        await db.users.updateOne({ _id: viewer._id }, { $push: { bookings: insertedBooking._id } });

        // update the listing document `bookingsIndex` field & push the new booking id to the `bookings` array field
        await db.listings.updateOne(
          { _id: listing._id },
          {
            $set: { bookingsIndex },
            $push: { bookings: insertedBooking._id },
          }
        );

        // return newly inserted booking
        return insertedBooking;
      } catch (error) {
        throw new Error(`Failed to create a booking: ${error}`);
      }
    },
  },
};