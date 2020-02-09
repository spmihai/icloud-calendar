import * as request from 'request';
import * as setCookie from 'set-cookie-parser';
import { 
    SETUP_URL,
    LOGIN_SUFFIX,
    DEFAULT_ORIGIN_ADDRESS,
    DEFAULT_REFERER_ADDRESS,
    DEFAULT_USER_AGENT,
    DEFAULT_HOST_DOMAIN,
    VALIDATE_SUFFIX,
    EVENTS_WS_SUFFIX,
    EVENT_DETAILS_WS_SUFFIX
} from './config';
import { UserData } from './userData';
import { ICloudSession } from './icloudSession';
import { LanguageLocales } from './languageLocales';
import { ICloudRequestParams } from './icloudRequestParams';
import { TimeZones } from './timeZones';

export class ICloudCalendar {
    private hostDomain: string;
    private originAddress: string;
    private refererAddress: string;
    private userAgent: string;
    private request: any;
    private session: ICloudSession;

    constructor(userAgent?: string, hostDomain?:string, originAddress?: string, refererAddress?: string) {
        this.userAgent = userAgent ? userAgent : DEFAULT_USER_AGENT;
        this.hostDomain = hostDomain ? hostDomain : DEFAULT_HOST_DOMAIN;
        this.originAddress = originAddress ? originAddress : DEFAULT_ORIGIN_ADDRESS;
        this.refererAddress = refererAddress ? refererAddress : DEFAULT_REFERER_ADDRESS;
        
        this.request = request.defaults({
            headers : {
                'host': this.hostDomain,
                'origin': this.originAddress,
                'referer': this.refererAddress,
                'User-Agent': this.userAgent
            },
            jar: request.jar(),
            json: true
        });
        this.session = new ICloudSession();
    }
    
    public async login(appleId: string, password: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!appleId || !password) {
                reject('Invalid login credentials!');
            } else {
                if (this.isConnected()) {
                    resolve(this.session.getParams());
                } else {
                    const requestConfig = {
                        url: `${SETUP_URL}${LOGIN_SUFFIX}`,
                        qs: this.session.getParams(),
                        json: new UserData(appleId, password)
                    }
                    this.request.post(requestConfig, (err: any, resp: any, data: any) => {
                        if(err || data.error) {
                            reject('Invalid email/password combination.');
                        }
                        resolve(this.setConnectionData(data, resp));
                    });
                }
            }
        });
    }

    public isConnected(): boolean {
        if (this.session.getExpire()) {
            var now = new Date();
            return now.getTime() < this.session.getExpire().getTime();
        }
        else {
            return false;
        }
    }

    public async getCalendars(language: LanguageLocales, timeZone: TimeZones): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const now = new Date();
                const month = now.getMonth() + 1;
                const today = `${now.getFullYear()}-${month<10 ? `0${month}` : month}-${now.getDate()}`;
                const calendarData = await this.getCalendarData(language, timeZone, today, today);
                if (calendarData && calendarData.Collection) {
                    resolve(calendarData.Collection);
                } else {
                    resolve({});
                }
            } catch(err) {
                reject(err);
            }
        });
    }

    public async getEvents(language: LanguageLocales, timeZone: TimeZones, startDate: string, endDate: string): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const calendarData = await this.getCalendarData(language, timeZone, startDate, endDate);
                if (calendarData && calendarData.Event) {
                    resolve(calendarData.Event);
                } else {
                    resolve({});
                }
            } catch(err) {
                reject(err);
            }
        });
    }

    public async getEventDetails(guid: string, pGuid: string, language: LanguageLocales, timeZone: TimeZones): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const validated = await this.validateSession();
                if (validated) {
                    if (!this.isConnected()) {
                        reject('Invalid connection to iCloud! Check X-APPLE-WEBAUTH-TOKEN existance');
                    } else {
                        const params = this.generateRequestParams(language, timeZone, null, null);
                        const calendarData = await this.fetchData(`${EVENT_DETAILS_WS_SUFFIX}/${pGuid}/${guid}`, params);
                        if (calendarData && calendarData.Event) {
                            resolve(calendarData.Event);
                        } else {
                            resolve({});
                        }
                    }
                } else {
                    reject('Current session is not valid! Try to login first.');
                }
            } catch(err) {
                reject(err);
            }
        });
    }

    private async getCalendarData(language: LanguageLocales, timeZone: TimeZones, startDate: string, endDate: string): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            let validated;
            try {
                validated = await this.validateSession();
            } catch(err) {
                reject(err);
            }
            if (validated) {
                if (!this.isConnected()) {
                    reject('Invalid connection to iCloud! Check X-APPLE-WEBAUTH-TOKEN existance');
                } else {
                    const webServices = this.session.getWebServices();
                    if (!webServices || !webServices.calendar || webServices.calendar.status !== 'active' || !webServices.calendar.url) {
                        reject('iCloud Calendar Web Service Unavailable');
                    } else {
                        try {
                            const params = this.generateRequestParams(language, timeZone, startDate, endDate);
                            const resp = await this.fetchData(EVENTS_WS_SUFFIX, params);
                            resolve(resp);
                        } catch(err) {
                            reject('Error fetching data! Try to login first.');
                        }
                    }
                }
            } else {
                reject('Current session is not valid! Try to login first.');
            }
        });
        
    }

    private setConnectionData(data: any, response: any): boolean {
        if (data && data.dsInfo) {
            this.session.setParamValue('dsid', data.dsInfo.dsid);
            if (data.webservices) {
                this.session.setWebServices(data.webservices);
            }
            const cookies = setCookie.parse(response, {
                decodeValues: true
            });
            for (let i = 0; i < cookies.length; i++) {
                if (cookies[i].expires) {
                    this.session.setExpire(new Date(cookies[i].expires));
                }
            }
            return true;
        }
        else {
            this.session.setExpire(null);
            this.session.setParamValue('dsid', undefined);
            this.session.setWebServices(undefined);
            return false;
        }
    }

    private generateRequestParams(language: LanguageLocales, timeZone: TimeZones, startDate?: string, endDate?: string): ICloudRequestParams {
        const dsid = this.session.getParams()['dsid'];
        return new ICloudRequestParams(dsid, language, timeZone, startDate, endDate);                 
    }

    private async validateSession(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const requestConfig = {
                url: `${SETUP_URL}${VALIDATE_SUFFIX}`,
                qs: this.session.getParams()
            };
            this.request.get(requestConfig, (err: any, resp: any, data: any) => {
                if (err) {
                    this.setConnectionData(null, null);
                    reject(err);
                } else {
                    this.setConnectionData(data, resp);
                    resolve(true);
                }
            });
        });
    }

    private async fetchData(serviceResource: string, params: ICloudRequestParams): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try {
                const webServiceUrl = this.session.getWebServices().calendar.url.replace(':443', '');
                const hostAddress = this.session.getWebServices().calendar.url.split('//')[1].split(':')[0];
                const requestConfig = {
                    url: `${webServiceUrl}${serviceResource}`,
                    qs: params,
                    headers: {
                        host: hostAddress
                    }
                }
                this.request.get(requestConfig, (err: any, resp: any, body: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(body);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

}