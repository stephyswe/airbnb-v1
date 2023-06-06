import React from "react";
import { Route, Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/react-testing";
import { GraphQLError } from "graphql";
import { AUTH_URL } from "../../../lib/graphql/queries";
import { LOG_IN } from "../../../lib/graphql/mutations";
import { Login } from "../index";

const defaultProps = {
  setViewer: () => {},
};

describe("Login", () => {
  // avoid console warnings around scrollTo
  window.scrollTo = () => {};

  describe("AUTH_URL Query", () => {
    it("redirects the user when query is successful", async () => {
      const authUrlMock = {
        request: {
          query: AUTH_URL,
        },
        result: {
          data: {
            authUrl: "https://google.com/signin",
          },
        },
      };

      const history = createMemoryHistory({
        initialEntries: ["/login"],
      });
      render(
        <MockedProvider mocks={[authUrlMock]} addTypename={false}>
          <Router location={history.location} navigator={history}>
              <Login {...defaultProps} />
          </Router>
        </MockedProvider>
      );

      const authUrlButton = screen.getByRole("button");
      fireEvent.click(authUrlButton);
      
      expect(window.location.assign).toHaveBeenCalledWith("https://google.com/signin");
      expect(
          screen.queryByText("Sorry! We weren't able to log you in. Please try again later!")
            ).toBeNull();
    });

    /* it("does not redirect the user when query is unsuccessful", async () => {
      window.location.assign = jest.fn();

      const authUrlMock = {
        request: {
          query: AUTH_URL,
        },
        errors: [new GraphQLError("Something went wrong")],
      };

      const history = createMemoryHistory({
        initialEntries: ["/login"],
      });
      render(
        <MockedProvider mocks={[authUrlMock]} addTypename={false}>
          <Router location={history.location} navigator={history}>
            <Route path="/login">
              <Login {...defaultProps} />
            </Route>
          </Router>
        </MockedProvider>
      );

      const authUrlButton = screen.getByRole("button");
      fireEvent.click(authUrlButton);

      await waitFor(() => {
        expect(window.location.assign).not.toHaveBeenCalledWith(
          "https://google.com/signin"
        );
        expect(
          screen.queryByText("Sorry! We weren't able to log you in. Please try again later!")
        ).not.toBeNull();
      }); 
    }); */
  });
/* 
  describe("LOGIN Mutation", () => {
    it("when no code exists in the /login route, the mutation is not fired", async () => {
      const logInMock = {
        request: {
          query: LOG_IN,
          variables: {
            input: {
              code: "1234",
            },
          },
        },
        result: {
          data: {
            logIn: {
              id: "111",
              token: "4321",
              avatar: "image.png",
              hasWallet: false,
              didRequest: true,
            },
          },
        },
      };

      const history = createMemoryHistory({
        initialEntries: ["/login"],
      });
      render(
        <MockedProvider mocks={[logInMock]} addTypename={false}>
          <Router location={history.location} navigator={history}>
            <Route path="/login">
              <Login {...defaultProps} />
            </Route>
          </Router>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(history.location.pathname).not.toBe("/user/111");
      });
    });

    describe("when code exists in the /login route as a query parameter", () => {
      it("redirects the user to their user page when the mutation is successful", async () => {
        const logInMock = {
          request: {
            query: LOG_IN,
            variables: {
              input: {
                code: "1234",
              },
            },
          },
          result: {
            data: {
              logIn: {
                id: "111",
                token: "4321",
                avatar: "image.png",
                hasWallet: false,
                didRequest: true,
              },
            },
          },
        };

        const history = createMemoryHistory({
          initialEntries: ["/login?code=1234"],
        });
        render(
          <MockedProvider mocks={[logInMock]} addTypename={false}>
            <Router location={history.location} navigator={history}>
              <Route path="/login">
                <Login {...defaultProps} />
              </Route>
            </Router>
          </MockedProvider>
        );

        await waitFor(() => {
          expect(history.location.pathname).toBe("/user/111");
        });
      });

      it("does not redirect the user to their user page and displays an error message when the mutation is unsuccessful", async () => {
        const logInMock = {
          request: {
            query: LOG_IN,
            variables: {
              input: {
                code: "1234",
              },
            },
          },
          errors: [new GraphQLError("Something went wrong")],
        };

        const history = createMemoryHistory({
          initialEntries: ["/login?code=1234"],
        });
        render(
          <MockedProvider mocks={[logInMock]} addTypename={false}>
            <Router location={history.location} navigator={history}>
              <Route path="/login">
                <Login {...defaultProps} />
              </Route>
            </Router>
          </MockedProvider>
        );

        await waitFor(() => {
          expect(history.location.pathname).not.toBe("/user/111");
          expect(
            screen.queryByText("Sorry! We weren't able to log you in. Please try again later!")
          ).not.toBeNull();
        });
      });
    });
  }); */
});
