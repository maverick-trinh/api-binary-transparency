import { WalrusController } from "../../src/controllers/walrus_controller";
import { Request, Response } from "express";
import { HttpStatusCodes } from "../../src/enums";

const mockSend = jest.fn();
const mockStatus = jest.fn(() => ({ json: mockSend }));
const mockRes = { status: mockStatus, json: mockSend } as unknown as Response;

jest.mock("../../src/services/walrus_service", () => {
  return {
    WalrusService: jest.fn().mockImplementation(() => ({
      resolvePortalObjectId: jest.fn(async (url: string) => {
        if (url === "https://valid.wal.app/") return "portalObjectId123";
        return null;
      }),
      fetchBlobData: jest.fn(async (objectId: string) => ({
        data: {
          blobs: [{ id: "blob1", data: "abc" }],
          owner: "owner123",
          portalObjectId: objectId,
        },
      })),
    })),
  };
});

describe("WalrusController.fetchBlobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if name param is missing", async () => {
    const req = { query: {} } as Request;
    await WalrusController.fetchBlobs(req, mockRes);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatusCodes.BAD_REQUEST);
  });

  it("should return 400 if name param is invalid", async () => {
    const req = { query: { name: "invalid-url" } } as Request;
    await WalrusController.fetchBlobs(req, mockRes);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatusCodes.BAD_REQUEST);
  });

  it("should return 404 if portalObjectId not found", async () => {
    const req = { query: { name: "https://notfound.wal.app/" } } as Request;
    await WalrusController.fetchBlobs(req, mockRes);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatusCodes.NOT_FOUND);
  });

  it("should return 200 and blob data for valid request", async () => {
    const req = { query: { name: "https://valid.wal.app/" } } as Request;
    await WalrusController.fetchBlobs(req, mockRes);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatusCodes.OK);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: expect.any(Array),
        owner: "owner123",
        portalObjectId: "portalObjectId123",
      })
    );
  });
});
