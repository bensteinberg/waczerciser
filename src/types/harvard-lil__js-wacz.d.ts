declare module '@harvard-lil/js-wacz' {
    export class WACZ {
        constructor(config: {
            input: string;
            output: string;
            pagesDir?: string;
            logDir?: string;
        });
        process(): Promise<void>;
    }
} 