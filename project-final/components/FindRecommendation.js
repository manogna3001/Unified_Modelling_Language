import OpenAI from "openai";
import React, { useState, useEffect } from 'react';
import { Button, Modal, Box, Typography, TextField } from '@mui/material';


const OPENAI_API_KEY = ' ';


const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});


async function getLocation() {
  if (navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const { latitude, longitude } = coords;

          if (window.google?.maps?.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results, status) => {
                if (status === 'OK' && results[0]) {
                  const comp = results[0].address_components;
                  const city = comp.find(c => c.types.includes('locality'))?.long_name;
                  const region = comp.find(c => c.types.includes('administrative_area_level_1'))?.long_name;
                  resolve({
                    latitude,
                    longitude,
                    city,
                    region,
                    formatted_address: results[0].formatted_address
                  });
                } else {
                  resolve({ latitude, longitude });
                }
              }
            );
          } else {
            resolve({ latitude, longitude });
          }
        },
        async (err) => {
          console.warn("Geolocation failed, falling back to IP lookup:", err);
          const ipData = await fetch("https://ipapi.co/json/").then(r => r.json());
          resolve(ipData);
        },
        { timeout: 10000 }
      );
    });
  }

  console.warn("Geolocation not supported, using IP lookup");
  return fetch("https://ipapi.co/json/").then(r => r.json());
}



async function getCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const response = await fetch(url);
  const weatherData = await response.json();
  return weatherData;
}


async function internetSearch(query) {
  console.log('calling serpapi')
  const response = await fetch(
    `http://localhost:5000/proxy-serpapi?q=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  console.log('calling serpapi', data)
  return data;
}


const RecommendationModal = () => {
  const [allLocations, setAllLocations] = useState({
    restaurants: [],
    music: [],
    sports: []
  });

  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [map, setMap] = useState(null);
 


  useEffect(() => {
    const fetchData = async () => {
      const location = await getLocation();
      setCurrentLocation(location);

      const weather = await getCurrentWeather(location.latitude, location.longitude);
      setCurrentWeather(weather);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allLocations.restaurants.length > 0 || allLocations.music.length > 0 || allLocations.sports.length > 0) {
      initializeMap();
    }
  }, [allLocations]); 

  useEffect(() => {
    if (!map || !currentLocation) return;

    const addMarkers = (locations, iconUrl, labelPrefix) => {
      const validLocations = locations.filter(loc => loc && typeof loc.lat === 'number' && typeof loc.lng === 'number');
      const limited = validLocations.slice(0, 9);

      limited.forEach((loc, index) => {
        const marker = new window.google.maps.Marker({
          position: { lat: loc.lat, lng: loc.lng },
          map,
          icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(32, 32),
          },
          label: {
            text: `${labelPrefix}${index + 1}`,
            color: 'black',
          },
          title: loc.name,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: Arial, sans-serif; font-size: 14px;">
              <strong>${loc.name}</strong><br/>
              <em>${loc.hours}</em><br/>
              <span>${currentLocation?.city}</span>
            </div>
          `
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });
      });
    };


    addMarkers(allLocations.restaurants, 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', 'R');
    addMarkers(allLocations.music, 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', 'M');
    addMarkers(allLocations.sports, 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png', 'S');
  }, [allLocations, map]);



  const initializeMap = () => {
    if (!currentLocation || typeof google === 'undefined') return;

    const mapCenter = {
      lat: parseFloat(currentLocation.latitude),
      lng: parseFloat(currentLocation.longitude)
    };

    const mapElement = document.getElementById('google-map');
    if (!mapElement) return;

    const newMap = new window.google.maps.Map(mapElement, {
      center: mapCenter,
      zoom: 11,
    });

    setMap(newMap);

    new window.google.maps.Marker({
      position: mapCenter,
      map: newMap,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new window.google.maps.Size(40, 40),
      },
      label: {
        text: 'You',
        color: 'white',
        fontWeight: 'bold'
      },
      title: "You are here"
    });
  }

  const handleClick = async () => {
    if (!currentLocation) {
      console.warn("Location not yet available.");
      return;
    }

    setOpen(true);

    const locationStr = `${currentLocation.city}, ${currentLocation.region}`;


    const temperature = currentWeather?.current_weather?.temperature ?? "unknown";
    const weatherCode = currentWeather?.current_weather?.weathercode;
    const weatherMeaning = {
      0: "clear sky",
      1: "mainly clear",
      2: "partly cloudy",
      3: "overcast",
      45: "fog",
      48: "depositing rime fog",
      51: "light drizzle",
      53: "moderate drizzle",
      55: "dense drizzle",
      61: "slight rain",
      63: "moderate rain",
      65: "heavy rain",
      71: "slight snow",
      73: "moderate snow",
      75: "heavy snow",
      95: "thunderstorm",
    };

    const weatherCondition = (weatherCode !== undefined && weatherCode !== null)
      ? weatherMeaning[weatherCode] || "unlisted weather condition"
      : "unknown weather";
    const now = new Date().toLocaleString();

    const locationVariants = [
      locationStr,
      `near ${currentLocation.city}`,
      `${currentLocation.city} downtown`,
      `${currentLocation.city} metro area`
    ];
    const variedLocation = locationVariants[Math.floor(Math.random() * locationVariants.length)];

    const prompt = `
    As of ${now}, I'm currently in ${variedLocation}. The temperature here is around ${temperature}°C and the weather condition is ${weatherCondition}.
    Based on that, please recommend:
    give me weekly timings of each location 
    - 3 famous places for restaurants appropriate for this weather condition.
    - 3 musical events or concerts suitable for this weather condition.
    - 3 sports events or local sports events I can attend distinctt locations, considering weather condition comfort and distinct location for 3 sports events.

  

    Return the results as a single bulleted list, using only location names.
    Do not repeat any location. All 9 must be unique venues.
    Make sure they match the weather condition (e.g., cozy indoor for rain, open-air for sun, etc.).
    Avoid typical tourist traps and consider indoor vs outdoor based on weather.
    `;


    try {
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.9,
        messages: [
          { role: "system", content: "You are a helpful assistant that provides personalized, varied local recommendations." },
          { role: "user", content: prompt }
        ],
      });

      const content = chatResponse.choices[0].message.content;
      setResponse(content);

      const restaurantMatches = content.match(/(?<=restaurants.*?:)[\s\S]*?(?=\n\n|musical|music|concerts)/i);
      const musicMatches = content.match(/(?<=concerts.*?:)[\s\S]*?(?=\n\n|sports)/i);
      const sportsMatches = content.match(/(?<=sports.*?:)[\s\S]*$/i);

      const parseList = (block) => {
        if (!block) return [];

        const list = block
          .trim()
          .split(/\n|•|[0-9]\./)
          .map(item => {
            const cleaned = item.trim().replace(/^[-•\s]+/, '');
            const match = cleaned.match(/^(.*?)(?:[,(](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i);
            return match ? match[1].trim() : cleaned;
          })
          .filter(Boolean);

        return list;
      };

      const restaurants = parseList(restaurantMatches?.[0]);
      const music = parseList(musicMatches?.[0]);
      const sports = parseList(sportsMatches?.[0]);

      console.log("GPT Restaurants:", restaurants);
      console.log("GPT Music:", music);
      console.log("GPT Sports:", sports);

      const geocodeAll = async (list) => {
        const results = [];
        for (const item of list) {
          const cleanedQuery = item.trim();

          if (!cleanedQuery || cleanedQuery.length < 3 || /^[^a-zA-Z0-9]+$/.test(cleanedQuery)) {
            console.warn("Skipping invalid query:", item);
            continue;
          }
          const coord = await window.geocodeAddress(`${cleanedQuery}, ${currentLocation.city}`);
          if (coord) {
            results.push({ name: cleanedQuery, ...coord });
            console.log(`Geocoded '${cleanedQuery}' →`, coord);
          }
        }
        return results;
      };

      const [restaurantLocations, musicLocations, sportsLocations] = await Promise.all([
        geocodeAll(restaurants),
        geocodeAll(music),
        geocodeAll(sports)
      ]);


      async function enrichWithHours(list) {
        const out = [];
      
        for (const loc of list) {
          const result = await internetSearch(
            `${loc.name.split(':')[0]} ${currentLocation.city} hours`
          );
          const kg = result.knowledge_graph || {};
      
          let formattedHours = "Hours unavailable";
          if (kg.hours) {
            formattedHours = Object.entries(kg.hours)
              .map(([day, info]) => {
                const capDay = day.charAt(0).toUpperCase() + day.slice(1);
                let range = `${info.opens}–${info.closes}`;
                if (info.break) range += ` (break ${info.break})`;
                return `${capDay}: ${range}`;
              })
              .join("<br/>");  
          }
          else if (kg.raw_hours) {
            formattedHours = kg.raw_hours;
          }
      
          out.push({
            ...loc,
            hours: formattedHours,
            location: kg.address || ""
          });
        }
      
        return out;
      }
      

      const [restaurantsWithHours, musicWithHours, sportsWithHours] = await Promise.all([
        enrichWithHours(restaurantLocations),
        enrichWithHours(musicLocations),
        enrichWithHours(sportsLocations),
      ]);


      setAllLocations({

        restaurants: restaurantsWithHours,
        music: musicWithHours,
        sports: sportsWithHours,
      });
     
      setTimeout(() => {
          initializeMap();
      }, 300);
    } catch (err) {
      console.error("OpenAI Error:", err);
      setResponse("Sorry! We couldn't fetch recommendations right now.");
    }
  };




  const handleClose = () => {
    setOpen(false);
    setMap(null);
    setResponse('');
  };

  const convertCelsiusToFahrenheit = (celsius) => (celsius * 9 / 5) + 32;

  return (
    <>
      <Button variant="outlined" size="small" color="primary" onClick={handleClick}>
        Recommended For You
      </Button>
      <Modal open={open} onClose={handleClose}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 1000, height: 700, bgcolor: 'background.paper', boxShadow: 24, p: 4, overflow: 'auto' }}>
          <Typography variant="h6">Recommended For You</Typography>

          <div id="google-map" style={{ width: '100%', height: '300px', marginBottom: '20px' }}></div>

          <Typography variant="body1">
            Location: {currentLocation ? `${currentLocation.city}, ${currentLocation.region}` : 'Loading...'}<br />
          </Typography>

          <Typography variant="body1">
            Weather: {currentWeather ? `${convertCelsiusToFahrenheit(currentWeather.current_weather.temperature)}°F` : 'Loading...'}
          </Typography>


          <Typography variant="h6" sx={{ mt: 3 }}>Recommended Places to Visit</Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={response || "Loading recommendations..."}
            disabled
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </Box>
      </Modal>
    </>
  );
};

export default RecommendationModal;
