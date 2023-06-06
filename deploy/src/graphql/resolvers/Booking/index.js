"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingResolvers = void 0;
const mongodb_1 = require("mongodb");
const api_1 = require("../../../lib/api");
const utils_1 = require("../../../lib/utils");
const MILISECONDS_IN_A_DAY = 86400000; // 24h * 60m * 60s * 1000ms
const resolveBookingsIndex = (bookingsIndex, checkInDate, checkOutDate) => {
    let dateCursor = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const newBookingsIndex = Object.assign({}, bookingsIndex);
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
        }
        else {
            throw new Error("selected dates can't overlap dates that have already been booked");
        }
        dateCursor = new Date(dateCursor.getTime() + MILISECONDS_IN_A_DAY);
    }
    return newBookingsIndex;
};
exports.bookingResolvers = {
    Booking: {
        id: (booking) => {
            return booking._id.toString();
        },
        listing: (booking, _args, { db }) => {
            return db.listings.findOne({ _id: booking.listing });
        },
        tenant: (booking, _args, { db }) => {
            return db.users.findOne({ _id: booking.tenant });
        },
    },
    Mutation: {
        createBooking: (_root, { input }, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { id, source, checkIn, checkOut } = input;
                // verify a logged in user is making request
                const viewer = yield (0, utils_1.authorize)(db, req);
                if (!viewer) {
                    throw new Error("viewer cannot be found");
                }
                // find listing document that is being booked
                const listing = yield db.listings.findOne({ _id: new mongodb_1.ObjectId(id) });
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
                const host = yield db.users.findOne({
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
                yield api_1.Stripe.charge(totalPrice, source, host.walletId);
                // insert a new booking document to bookings collection
                const insertRes = yield db.bookings.insertOne({
                    _id: new mongodb_1.ObjectId(),
                    listing: listing._id,
                    tenant: viewer._id,
                    checkIn,
                    checkOut,
                });
                // find inserted booking id
                const insertedBooking = yield db.bookings.findOne({ _id: insertRes.insertedId });
                if (!insertedBooking) {
                    throw new Error("Failed to insert booking");
                }
                // update the host user document to increment ("$inc") the `income` field by the totalPrice
                yield db.users.updateOne({ _id: host._id }, { $inc: { income: totalPrice } });
                // update the viewer user document to push ("$push") the new booking id to the `bookings` field
                yield db.users.updateOne({ _id: viewer._id }, { $push: { bookings: insertedBooking._id } });
                // update the listing document `bookingsIndex` field & push the new booking id to the `bookings` array field
                yield db.listings.updateOne({ _id: listing._id }, {
                    $set: { bookingsIndex },
                    $push: { bookings: insertedBooking._id },
                });
                // return newly inserted booking
                return insertedBooking;
            }
            catch (error) {
                throw new Error(`Failed to create a booking: ${error}`);
            }
        }),
    },
};
