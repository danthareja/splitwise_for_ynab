import axios from "axios";
import {
  FormControl,
  FormHelperText,
  FormErrorMessage,
  Button,
  VStack,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

export default function Home() {
  const mutation = useMutation(async () => {
    const { visitorId } = await FingerprintJS.load().then((fp) => fp.get());

    const transactions = await axios
      .post(
        "/api/ynab_to_splitwise",
        {},
        {
          headers: {
            Authorization: `Bearer ${visitorId}`,
          },
        }
      )
      .then((res) => res.data.data.transactions);

    const expenses = await axios
      .post(
        "/api/splitwise_to_ynab",
        {},
        {
          headers: {
            Authorization: `Bearer ${visitorId}`,
          },
        }
      )
      .then((res) => res.data.data.expenses);

    return {
      transactions,
      expenses,
    };
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <VStack as={FormControl} isInvalid={mutation.isError} spacing={4}>
        <Button
          size="lg"
          type="submit"
          colorScheme="blue"
          isLoading={mutation.isLoading}
        >
          Sync YNAB/Splitwise
        </Button>
        {mutation.isError ? (
          <FormErrorMessage>
            {mutation.error.response.data.error}
          </FormErrorMessage>
        ) : mutation.isSuccess ? (
          <FormHelperText
            color={
              mutation.data.transactions.length > 0 ||
              mutation.data.expenses.length > 0
                ? "green.500"
                : "orange.500"
            }
          >
            {mutation.data.transactions.length > 0 ||
            mutation.data.expenses.length > 0
              ? `Synced ${mutation.data.transactions.length} YNAB transaction(s) and ${mutation.data.expenses.length} Splitwise expense(s)`
              : "Nothing new, try again later."}
          </FormHelperText>
        ) : mutation.isLoading ? (
          <FormHelperText>&nbsp;</FormHelperText>
        ) : (
          <FormHelperText>&nbsp;</FormHelperText>
        )}
      </VStack>
    </form>
  );
}
