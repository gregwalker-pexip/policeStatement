export const GeolocationPrompt: RPCCallPayload<"ui:prompt:open"> = {
  title: "Location Sharing Request",
  description:
    "Please accept this location request for evidence validation purposes.",
  prompt: {
    primaryAction: "Accept",
    secondaryAction: "Dismiss",
  },
};

export const StatementForm = {
  title: "Statement Approval",
  description: "I confirm the provided statement as being accurate and true.",
  form: {
    elements: {
      name: {
        placeholder: "Your Full Legal Name",
        value: "John Smith",
        type: "text",
        isOptional: false,
      },
      agreement: {
        type: "checklist",
        options: [
          {
            id: "falseStatementCheck",
            label:
              "I understand the concequences of making a false police report.",
          },
        ],
        isOptional: false,
      },
    },
    id: "submit-signing",
    submitBtnTitle: "SUBMIT",
  },
} as const;
