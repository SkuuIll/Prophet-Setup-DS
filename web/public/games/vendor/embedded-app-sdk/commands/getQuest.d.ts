export declare const getQuest: (sendCommand: import("../schema/types").TSendCommand) => (args: void) => Promise<{
    quest_id: string;
    external_cta_url: string;
    enrolled_at?: string | null | undefined;
    completed_at?: string | null | undefined;
}>;
