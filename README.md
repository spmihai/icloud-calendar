icloud-calendar
======

Connects to the iCloud API and retrieves Calendar data

## Installation

```
$ npm install icloud-calendar
```

### usage 

```typescript
const username = '[apple_id]';
const password = '[apple_id_password]';

const calendar = new ICloudCalendar();
calendar.login(username, password).then(resp => {
    calendar.getEvents(LanguageLocales["en-US"], TimeZones["America/New_York"], '2020-01-01', '2020-01-07').then(calendars => {
        console.log(calendars);
    }).catch(err => {
        console.error(err);
    });
}).catch(err => {
    console.error(err);
});
```

## License

MIT