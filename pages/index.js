import axios from "axios";
import {
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
  Button,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";

export default function Home() {
  const mutation = useMutation(async () => {
    const res = await axios.post("/api/ynab_to_splitwise");
    return res.data.data;
  });

  return (
    <FormControl as={VStack} isInvalid={mutation.isError}>
      <FormLabel m={0}>Tired of entering Splitwise expenses?</FormLabel>
      <Button
        colorScheme="blue"
        isLoading={mutation.isLoading}
        onClick={() => mutation.mutate()}
        size="lg"
      >
        Sync YNAB and Splitwise
      </Button>
      {mutation.isError ? (
        <FormErrorMessage>{mutation.error.message}</FormErrorMessage>
      ) : mutation.isSuccess ? (
        <FormHelperText
          color={
            mutation.data.transactions.length > 0 ? "green.500" : "orange.500"
          }
        >
          {mutation.data.transactions.length > 0
            ? `Added ${mutation.data.transactions.length} new YNAB expense(s) to Splitwise`
            : "No new transactions, try again later."}
        </FormHelperText>
      ) : mutation.isLoading ? (
        <FormHelperText>...</FormHelperText>
      ) : (
        <FormHelperText>Click the button to do the thing</FormHelperText>
      )}
    </FormControl>
  );
}
