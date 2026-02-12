import React from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import Root from "./root.component";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      // Data is considered stale immediately, so it will refetch on mount
      staleTime: 0,
      // Keep data in cache for 5 minutes (default)
      gcTime: 5 * 60 * 1000,
      // Refetch when window regains focus to get fresh data
      refetchOnWindowFocus: true,
      // Refetch on reconnect to get fresh data after network issues
      refetchOnReconnect: true,
    },
  },
});

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: () => (
    <BrowserRouter
      basename={
        window.location.hostname.includes("buildermaps.io")
          ? ""
          : "/buildermaps"
      }
    >
      <QueryClientProvider client={queryClient}>
        <Root />
        <Toaster containerClassName="font-medium" />
      </QueryClientProvider>
    </BrowserRouter>
  ),
  errorBoundary(err, info, props) {
    // Customize the root error boundary for your microfrontend here.
    return null;
  },
});

const { bootstrap, unmount } = lifecycles;

const mount = (config) => {
  if (document.getElementById("home-placeholder")) {
    document.getElementById("home-placeholder").style.display = "none";
    document.getElementById("home-placeholder").remove();
  }

  document.title = "Buildermaps.io";

  return lifecycles.mount(config);
};

window.onunhandledrejection = function (event) {
  console.error("[Global Promise Rejection]", event.reason);

  event.preventDefault();
};
export { bootstrap, mount, unmount };
