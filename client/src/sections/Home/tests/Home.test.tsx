import { createMemoryHistory }  from "history";
import { MemoryRouter, Router } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/react-testing";
import { Home } from "../index";
import { ListingsFilter } from "../../../lib/graphql/globalTypes";
import { LISTINGS } from "../../../lib/graphql/queries";

describe("Home", () => {
  // remove console error with window.scrollTo
  window.scrollTo = () => {};

  describe("search input", () => {
    it("renders an empty search input on initial render", async () => {
     render(
        <MockedProvider mocks={[]}>
          <MemoryRouter initialEntries={["/home"]}>
            <Home />
          </MemoryRouter>
        </MockedProvider>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          "Search 'San Fransisco'"
        ) as HTMLInputElement;

        expect(searchInput.value).toEqual("");
      });
    });

    it("redirects the user to the /listings page when a valid search is provided", async () => {
      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[]}>
          <Router location={history.location} navigator={history}>
            <Home />
          </Router>
        </MockedProvider>
      );
        const searchInput = screen.getByPlaceholderText(
          "Search 'San Fransisco'"
        ) as HTMLInputElement;

        fireEvent.change(searchInput, { target: { value: "Toronto" } });
        fireEvent.keyDown(searchInput, {
          key: "Enter",
          keyCode: 13,
        });

        expect(history.location.pathname).toBe("/listings/Toronto");
    });

    it("does not redirect the user to the /listings page when an invalid search is provided", async () => {
      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[]}>
          <Router location={history.location} navigator={history}>
            <Home />
          </Router>
        </MockedProvider>
      );
        const searchInput = screen.getByPlaceholderText(
          "Search 'San Fransisco'"
        ) as HTMLInputElement;

        fireEvent.change(searchInput, { target: { value: "" } });
        fireEvent.keyDown(searchInput, {
          key: "Enter",
          keyCode: 13,
        });

        expect(history.location.pathname).toBe("/");
    });

  });

  describe("premium listings", () => {
    it("renders the loading state when the query is loading", async () => {
      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[]}>
          <Router location={history.location} navigator={history}>
            <Home />
          </Router>
        </MockedProvider>
      );

      expect(screen.queryByText("Premium Listings")).toBeNull();
    });

    it("renders the intended UI when the query is successful", async () => {
      const listingsMock = {
        request: {
          query: LISTINGS,
          variables: {
            filter: ListingsFilter.PRICE_HIGH_TO_LOW,
            limit: 4,
            page: 1,
          },
        },
        result: {
          data: {
            listings: {
              region: null,
              total: 1,
              result: [
                {
                  id: "1234",
                  title: "Bev Hills",
                  image: "image.png",
                  address: "90210 Bev Hills",
                  price: 9000,
                  numOfGuests: 5,
                },
              ],
            },
          },
        },
      };

      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[listingsMock]} addTypename={false}>
          <Router location={history.location} navigator={history}>
            <Home />
          </Router>
        </MockedProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 0)); 

      await screen.findByText("Bev Hills")
    });

    it("does not render the loading section or the listings section when query has an error", async () => {
      const listingsMock = {
        request: {
          query: LISTINGS,
          variables: {
            filter: ListingsFilter.PRICE_HIGH_TO_LOW,
            limit: 4,
            page: 1,
          },
        },
        error: new Error("Network Error"),
      };

      const history = createMemoryHistory();
      render(
        <MockedProvider mocks={[listingsMock]} addTypename={false}>
          <Router location={history.location} navigator={history}>
            <Home />
          </Router>
        </MockedProvider>
      );
      
      expect(screen.queryByText("Premium Listings")).toBeNull();
      expect(screen.queryByText("Premium Listings - Loading")).toBeNull();
      
    });
  });
});
