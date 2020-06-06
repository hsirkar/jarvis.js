let axios = require('axios').default;

let instance, lat, lon, city, appid;

const Weather = {
    name: 'Weather',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;

        instance = axios.create({
            method: 'get',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Dnt': '1',
                'Referer': 'https://www.google.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0'
            }
        });
        
        lat = process.env.DEFAULT_COORDS.split(',')[0];
        lon = process.env.DEFAULT_COORDS.split(',')[1];
        city = process.env.DEFAULT_CITY;
        appid = process.env.OWM_APPID;
    },
    doesHandleIntent: intentName => intentName.startsWith('weather'),
    handleIntent: nlpRes => {
        const { log, respond } = this;
        (async () => {
            try {
                const res = await instance.get('http://ip-api.com/json');

                if (res && res.status === 200 && res.data && res.data.city && res.data.regionName && res.data.countryCode) {
                    city = `${res.data.city || ''}, ${res.data.regionName || ''}`
                    lat = res.data.lat;
                    lon = res.data.lon;
                    log(`Host city set as ${city} at (${lat}, ${lon})`);
                } else
                    log(`Failed getting current host city, using ${city}`);

            } catch (err) { log(`Failed getting current host city ${err}, using ${city}`) }

            log(`Looking up weather for (${lat}, ${lon})...`);

            try {
                const res = await instance.get(`http://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${appid}&units=imperial&exclude=minutely`);

                if(res && res.status === 200 && res.data){
                    log('Successfully retrieved weather');
                    const { current, daily } = res.data;
                    respond(
                        nlpRes.answer
                            .replace('%city%', city)
                            .replace('%desc%', current.weather[0].description)
                            .replace('%wind%', Math.round(current.wind_speed))
                            .replace('%temp%', Math.round(current.feels_like))
                            .replace('%high%', Math.round(daily[0].temp.max))
                            .replace('%low%', Math.round(daily[0].temp.min))
                            .replace('%ddesc%', daily[0].weather[0].description)
                    );
                    return;
                } else {
                    log(`Failed getting weather`);
                }

            } catch (err) { log(err, err.stack) }

            respond([`I was unable to get the weather`, `I could not get the weather`]);
        })();
    }
};

module.exports = Weather;