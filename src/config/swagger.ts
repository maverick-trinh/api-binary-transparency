import swaggerJsdoc from "swagger-jsdoc";
import { PORT } from './environment';

export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SuiNS Blob Fetcher API with Walrus SDK",
      version: "1.0.0",
      description:
        "API to resolve SuiNS names and fetch associated blob data from the Walrus network using Walrus SDK",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
