#!/usr/bin/env node
/**
 * Generates the OpenAPI spec as valid JSON.
 * Run: node scripts/generate-openapi.js > api-reference/openapi.json
 */
const spec = {
  openapi: "3.0.3",
  info: {
    title: "OpenMail API",
    description:
      "Email infrastructure API for AI agents. Create inboxes, send and receive email, and get real-time notifications via webhooks.",
    version: "1.0.0",
    license: { name: "Proprietary" },
  },
  servers: [{ url: "https://api.openmail.sh" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/v1/inboxes": {
      get: {
        summary: "List inboxes",
        description: "List all inboxes for your account. Supports pagination.",
        operationId: "listInboxes",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, maximum: 100 },
            description: "Max results to return",
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
            description: "Number of results to skip",
          },
        ],
        responses: {
          "200": {
            description: "List of inboxes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Inbox" } },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create inbox",
        description:
          "Create a new email inbox. Optionally set a sender display name.",
        operationId: "createInbox",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mailboxName: {
                    type: "string",
                    minLength: 3,
                    maxLength: 30,
                    description: "Inbox local part (default: random)",
                  },
                  displayName: {
                    type: "string",
                    maxLength: 200,
                    description: "Sender display name shown in the From header",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Inbox created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Inbox" },
              },
            },
          },
          "400": {
            description: "Invalid mailbox name",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "409": {
            description: "Address already in use",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "422": {
            description: "Plan inbox limit reached",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "429": {
            description: "Rate limit exceeded (100 inbox creations/day)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/v1/inboxes/{id}": {
      get: {
        summary: "Get inbox",
        operationId: "getInbox",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Inbox details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Inbox" } } },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      patch: {
        summary: "Update inbox",
        operationId: "updateInbox",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: {
                    type: "string",
                    nullable: true,
                    maxLength: 200,
                    description: "Sender display name. Set null to clear.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Inbox updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Inbox" } } },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      delete: {
        summary: "Delete inbox",
        operationId: "deleteInbox",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Inbox deleted" },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/v1/inboxes/{id}/send": {
      post: {
        summary: "Send email",
        description:
          "Send an email from an inbox. Requires Idempotency-Key header. Use threadId to reply to an existing thread.",
        operationId: "sendEmail",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Unique key for idempotent sends (e.g. UUID)",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["to", "subject", "body"],
                properties: {
                  to: { type: "string", format: "email" },
                  subject: { type: "string", minLength: 1, maxLength: 998 },
                  body: { type: "string", minLength: 1, maxLength: 100000 },
                  bodyHtml: { type: "string", maxLength: 500000 },
                  threadId: { type: "string", description: "Thread ID for replies" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Email sent (or idempotent replay)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    messageId: { type: "string" },
                    threadId: { type: "string" },
                    providerMessageId: { type: "string" },
                    status: { type: "string", enum: ["pending", "sent", "failed"] },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing Idempotency-Key",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "404": {
            description: "Inbox or thread not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "422": {
            description: "Recipient suppressed (bounce/complaint)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "429": {
            description: "Rate limit exceeded (global daily, per-inbox daily, per-inbox burst) or cold outreach limit. Check the Retry-After response header.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/v1/inboxes/{id}/messages": {
      get: {
        summary: "List messages",
        operationId: "listMessages",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          {
            name: "direction",
            in: "query",
            schema: { type: "string", enum: ["inbound", "outbound"] },
          },
        ],
        responses: {
          "200": {
            description: "List of messages",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Message" } },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/inboxes/{id}/threads": {
      get: {
        summary: "List threads",
        operationId: "listThreads",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": {
            description: "List of threads",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Thread" } },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/threads/{id}/messages": {
      get: {
        summary: "Get thread messages",
        operationId: "getThreadMessages",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Thread with messages",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    threadId: { type: "string" },
                    subject: { type: "string" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Message" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/attachments/{messageId}/{filename}": {
      get: {
        summary: "Get attachment",
        description: "Returns a 302 redirect to a signed URL for the attachment.",
        operationId: "getAttachment",
        parameters: [
          { name: "messageId", in: "path", required: true, schema: { type: "string" } },
          { name: "filename", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "302": { description: "Redirect to attachment URL" },
          "404": {
            description: "Attachment not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/v1/attachments/{messageId}/{filename}/text": {
      get: {
        summary: "Extract attachment text",
        description: "Extracts and returns the plain text content of an attachment. Supports PDF, DOCX, XLSX, PPTX, images (via OCR), and other common formats. The result is cached on the message after the first extraction.",
        operationId: "getAttachmentText",
        parameters: [
          { name: "messageId", in: "path", required: true, schema: { type: "string" } },
          { name: "filename", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Extracted text content",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    filename: { type: "string" },
                    contentType: { type: "string" },
                    extractionMethod: { type: "string", description: "Method used to extract text (e.g. pdf, docx, ocr)" },
                    text: { type: "string" },
                  },
                },
              },
            },
          },
          "404": {
            description: "Attachment not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "422": {
            description: "Text could not be extracted from the attachment",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Inbox: {
        type: "object",
        properties: {
          id: { type: "string", description: "OpenMail inbox ID" },
          address: { type: "string", format: "email", description: "Full email address" },
          displayName: { type: "string", description: "Sender display name", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string" },
          threadId: { type: "string" },
          direction: { type: "string", enum: ["inbound", "outbound"] },
          fromAddr: { type: "string" },
          toAddr: { type: "string" },
          subject: { type: "string" },
          bodyText: { type: "string" },
          bodyHtml: { type: "string" },
          attachments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                filename: { type: "string" },
                contentType: { type: "string" },
                sizeBytes: { type: "integer" },
                url: { type: "string", description: "Signed URL for download" },
              },
            },
          },
          status: {
            type: "string",
            enum: ["pending", "sent", "received", "failed"],
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Thread: {
        type: "object",
        properties: {
          id: { type: "string" },
          subject: { type: "string" },
          lastMessageAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          messageCount: { type: "integer" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API key",
      },
    },
  },
};

const fs = require("fs");
const path = require("path");

const json = JSON.stringify(spec, null, 2);

const docsPath = path.join(__dirname, "..", "api-reference", "openapi.json");
fs.writeFileSync(docsPath, json);
console.log("Wrote", docsPath);

const apiPath = path.join(__dirname, "..", "..", "openmail", "apps", "api", "src", "openapi.json");
if (fs.existsSync(path.dirname(apiPath))) {
  fs.writeFileSync(apiPath, json);
  console.log("Wrote", apiPath);
} else {
  console.warn("Skipped API sync — path not found:", apiPath);
}
