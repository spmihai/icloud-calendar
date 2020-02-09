export class ICloudSession{
    private params: any;
    private expires: Date;
    private webServices: any;

    constructor(params?: any, expires?: Date, webServices?: any) {
        this.params = params ? params : {};
        this.expires = expires ? expires : null;
        this.webServices = webServices ? webServices : undefined;
    }

    public getParams(): any {
        return this.params;
    }

    public setParams(params: any): void {
        this.params = params;
    }

    public setParamValue(param: string, value: any): void {
        if (this.params) {
            this.params[param] = value;
        }
    }

    public getExpire(): Date {
        return this.expires;
    }

    public setExpire(expires: Date): void{
        this.expires = expires;
    }

    public getWebServices(): any {
        return this.webServices;
    }

    public setWebServices(webServices: any): void {
        this.webServices = webServices;
    }
}