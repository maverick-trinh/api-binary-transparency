import {
    GetObjectParams,
    MultiGetObjectsParams,
    GetDynamicFieldObjectParams,
    SuiObjectResponse,
} from "@mysten/sui/client";

export interface RPCSelectorInterface {
    getObject(input: GetObjectParams): Promise<SuiObjectResponse>;
    multiGetObjects(input: MultiGetObjectsParams): Promise<SuiObjectResponse[]>;
    getDynamicFieldObject(
        input: GetDynamicFieldObjectParams,
    ): Promise<SuiObjectResponse>;
}