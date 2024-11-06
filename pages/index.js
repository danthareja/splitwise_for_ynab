import { useEffect, useRef } from "react";
import axios from "axios";
import {
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
  Input,
  Button,
  VStack,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";

export default function Home() {
  const inputRef = useRef();
  const mutation = useMutation(async () => {
    const myTransactions = await axios
      .post(
        "/api/ynab_to_splitwise",
        {
          who: "mine",
        },
        {
          headers: {
            Authorization: `Bearer ${inputRef.current.value}`,
          },
        }
      )
      .then((res) => res.data.data.transactions);

    const partnerTransactions = await axios
      .post(
        "/api/ynab_to_splitwise",
        {
          who: "partner",
        },
        {
          headers: {
            Authorization: `Bearer ${inputRef.current.value}`,
          },
        }
      )
      .then((res) => res.data.data.transactions);

    const laTransactions = await axios
      .post(
        "/api/ynab_to_splitwise",
        {
          who: "2024.11 LA",
        },
        {
          headers: {
            Authorization: `Bearer ${inputRef.current.value}`,
          },
        }
      )
      .then((res) => res.data.data.transactions);

    const transactions = [...myTransactions, ...partnerTransactions, ...laTransactions];

    const myExpenses = await axios
      .post(
        "/api/splitwise_to_ynab",
        {
          who: "mine",
        },
        {
          headers: {
            Authorization: `Bearer ${inputRef.current.value}`,
          },
        }
      )
      .then((res) => res.data.data.expenses);

    const partnerExpenses = await axios
      .post(
        "/api/splitwise_to_ynab",
        {
          who: "partner",
        },
        {
          headers: {
            Authorization: `Bearer ${inputRef.current.value}`,
          },
        }
      )
      .then((res) => res.data.data.expenses);

    const expenses = [...myExpenses, ...partnerExpenses];

    return {
      transactions,
      expenses,
    };
  });

  useEffect(() => {
    if (mutation.isError) {
      inputRef.current.focus();
    }
  }, [mutation.isError]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <VStack as={FormControl} isInvalid={mutation.isError} spacing={4}>
        <FormLabel mb={0}>Sync YNAB/Splitwise</FormLabel>
        <Input
          ref={inputRef}
          type="password"
          autoComplete="new-password"
          placeholder="Enter password"
          isDisabled={mutation.isLoading}
          w="200px"
        />
        <Button
          size="lg"
          type="submit"
          colorScheme="blue"
          isLoading={mutation.isLoading}
        >
          Sync
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
