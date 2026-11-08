import { definePlugin, defineRule } from "@oxlint/plugins";

const kept = /^\s*(?:SAFETY: \S|oxlint-(?:disable|enable)\S* .+ -- \S)|https:\/\//u;

export default definePlugin({
  meta: { name: "no-comments" },
  rules: {
    "no-comments": defineRule({
      create: (context) => ({
        Program: () => {
          for (const comment of context.sourceCode.getAllComments()) {
            if (comment.type !== "Shebang" && !kept.test(comment.value)) {
              context.report({
                message:
                  "Comments are banned: say it in a name, a type, a test or the commit. Kept: a link to an outside fact (https://…), a one-line SAFETY: for a type assertion, a lint directive with its reason after --.",
                node: comment,
              });
            }
          }
        },
      }),
    }),
  },
});
