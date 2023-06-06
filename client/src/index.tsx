import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApolloClient, ApolloProvider, createHttpLink, InMemoryCache, useMutation } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Affix, Layout, Spin } from "antd";
import reportWebVitals from "./reportWebVitals";
import { AppHeader, AppHeaderSkeleton, Home, Host, Listing, Listings, Login, NotFound, Stripe, User } from "./sections";
import { ErrorBanner } from "./lib/components";
import { LOG_IN } from "./lib/graphql/mutations";
import {
  LogIn as LogInData,
  LogInVariables,
} from "./lib/graphql/mutations/LogIn/__generated__/LogIn";
import { Viewer } from "./lib/types";
import "./styles/index.css";

const httpLink = createHttpLink({ uri: "/api" });

const authLink = setContext(() => {
  return {
    headers: {
      "X-CSRF-TOKEN": sessionStorage.getItem("token"),
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

const initialViewer: Viewer = {
  id: null,
  avatar: null,
  didRequest: false,
  hasWallet: null,
  token: null,
};

const stripePromise = loadStripe(process.env.REACT_APP_S_PUBLISHABLE_KEY as string);


const App = () => {
  const [viewer, setViewer] = useState<Viewer>(initialViewer);

  const [logIn, { error }] = useMutation<LogInData, LogInVariables>(LOG_IN, {
    onCompleted: (data) => {
      if (data && data.logIn) {
        setViewer(data.logIn);

        if (data.logIn.token) {
          sessionStorage.setItem("token", data.logIn.token);
        } else {
          sessionStorage.removeItem("token");
        }
      }
    },
  })

  const logInRef = useRef(logIn);

  useEffect(() => {
    logInRef.current();
  }, []);

  if (!viewer.didRequest && !error) {
    return (
      <Layout className="app-skeleton">
        <AppHeaderSkeleton />
        <div className="app-skeleton__spin-section">
          <Spin size="large" tip="Launching Tinyhouse" />
        </div>
      </Layout>
    );
  }

  const logInErrorBannerElement = error ? (
    <ErrorBanner description="We weren't able to verify if you were logged in. Please try again later!" />
  ) : null;



  return (
    <BrowserRouter>
      <Layout id="app">
        <Affix offsetTop={0} className="app__affix-header">
          <AppHeader viewer={viewer} setViewer={setViewer} />
        </Affix>
        {logInErrorBannerElement}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<Host viewer={viewer} />} />
          <Route
            path="/listing/:id"
            element={
              <Elements stripe={stripePromise}>
                <Listing viewer={viewer} />
              </Elements>
            }
          />
          <Route path="/listing/:id" element={<Listing viewer={viewer} />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:location" element={<Listings />} />
          <Route path="/login" element={<Login setViewer={setViewer} />} />
          <Route path="/stripe" element={<Stripe viewer={viewer} setViewer={setViewer} />} />
          <Route path="/user/:id" element={<User viewer={viewer} setViewer={setViewer} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

ReactDOM.render(
  <ApolloProvider client={client}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ApolloProvider>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();