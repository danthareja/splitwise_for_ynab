import * as React from "react";

import { ChakraProvider, Center } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <Center as="main" h="100vh">
          <Component {...pageProps} />
        </Center>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default MyApp;
