import { LanguageLocales } from "./languageLocales";

export class ICloudRequestParams{
    public startDate: string;
    public endDate: string;

    constructor(
        public dsid: string,
        public language: LanguageLocales,
        public usertz: string,
        startDate?: string,
        endDate?: string) {
            if (startDate) {
                this.startDate = startDate;
            }
            if (endDate) {
                this.endDate = endDate;
            }
        }
}

