import OpenAI from "openai";
import React, { useState, useEffect } from 'react';
import { Button, Modal, Box, Typography, TextField } from '@mui/material';


const OPENAI_API_KEY='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';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});


async function getLocation() {
  const response = await fetch("https://ipapi.co/json/");
  const locationData = await response.json();
  console.log(locationData);
  return locationData;
}
 
async function getCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=apparent_temperature`;
  const response = await fetch(url);
  const weatherData = await response.json();
  return weatherData;
}
 
const tools = [
  {
    type: "function",
    function: {
      name: "getCurrentWeather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "string",
          },
          longitude: {
            type: "string",
          },
        },
        required: ["longitude", "latitude"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "getLocation",
      description: "Get the user's current location based on their IP address",
      parameters: {
        type: "object",
        properties: {},
      },
    }
  },
];
 
const availableTools = {
  getCurrentWeather,
  getLocation,
};
 
const messages = [
  {
    role: "system",
    content: `You are a helpful assistant. Only use the functions you have been provided with.`,
  },
];
 
async function agent(userInput) {
  messages.push({
    role: "user",
    content: userInput,
  });
 
  for (let i = 0; i < 5; i++) {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      messages: messages,
      tools: tools,
    });
 
    const { finish_reason, message } = response.choices[0];
 
    if (finish_reason === "tool_calls" && message.tool_calls) {
      const functionName = message.tool_calls[0].function.name;
      const functionToCall = availableTools[functionName];
      const functionArgs = JSON.parse(message.tool_calls[0].function.arguments);
      const functionArgsArr = Object.values(functionArgs);
      const functionResponse = await functionToCall.apply(
        null,
        functionArgsArr
      );
 
      messages.push({
        role: "function",
        name: functionName,
        content: `
                The result of the last function was this: ${JSON.stringify(
                  functionResponse
                )}
                `,
      });
    } else if (finish_reason === "stop") {
      messages.push(message);
      return message.content;
    }
  }
  return "The maximum number of iterations has been met without a suitable answer. Please try again with a more specific input.";
}

// Modal To display Google Map and Recommendation based on location and weather
const RecommendationModal = () => {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [map, setMap] = useState(null);


  useEffect(() => {
    // Find current location and weather data
    const fetchData = async () => {
      const locationData = await getLocation();
      setCurrentLocation(locationData);
      const weatherData = await getCurrentWeather(locationData.latitude, locationData.longitude);
      setCurrentWeather(weatherData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (open && map === null) {
      // If modal is open and map is not initialized yet
      const timeout = setTimeout(() => {
        initializeMap();
      }, 100);
      
      // Clean up function
      return () => clearTimeout(timeout);
    }
  }, [open, map]);
  const initializeMap = () => {

    console.log("Current location:", currentLocation);
  
  if (!currentLocation) {
    console.log("Current location is not available yet.");
    return;
  }

    if (typeof google === 'undefined') {
      // Google Maps API is not loaded yet, wait for it
      return;
    }

    
  
    const mapCenter = { lat: currentLocation.latitude, lng: currentLocation.longitude };
    console.log("mapCenter :",mapCenter );
    const mapElement = document.getElementById('google-map');
    console.log("Map element:", mapElement);
    if (!mapElement) {
      console.log("Map element:", mapElement);
      return;
    }
  
    const mapOptions = {
      center: mapCenter,
      zoom: 10,
    };
    const newMap = new window.google.maps.Map(mapElement, mapOptions);
    setMap(newMap);
  
    const customMarkerIcon = { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
    scaledSize: {
      width: 40,
      height: 40
    }}

    
    // Add a marker
    new window.google.maps.Marker({
      position: mapCenter,
      map: newMap,
      icon: customMarkerIcon,
      label: {
        text: 'You are Here',
        color: 'darkblue'
      }
    });
  };
  const handleClick = async () => {
    setOpen(true);
    const response = await agent(
      "Please suggest some activities based on my current location and the current weather condition."
    );

    setResponse(response);
    
  };

  const handleClose = () => {
    setOpen(false);
    setMap(null);
    setResponse('');
  };

  const convertCelsiusToFahrenheit = (celsius) => {
    return (celsius * 9/5) + 32;
  };

  return (
    <>
      <Button variant="outlined" size="small" color="primary" onClick={handleClick}>
        Recommended For You
      </Button>
      <Modal open={open} onClose={handleClose} >
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 1000, height: 700, bgcolor: 'background.paper', boxShadow: 24, p: 4, overflow: 'auto' }}>
          <Typography id="modal-modal-title" variant="h6" component= "h2">Recommended For You</Typography>
          {/* Google Maps div */}
          <div
            id="google-map"
            style={{ width: '100%', height: '500px' }} // Adjust height as needed
          ></div>
          {/* Display current location and weather */}
          <Typography variant="body1" gutterBottom>
            Current Location: {currentLocation ? `${currentLocation.city}, ${currentLocation.country_name}` : 'Loading...'}
          </Typography>
          <Typography variant="body1" gutterBottom>
          Current Weather: {currentWeather ? `${convertCelsiusToFahrenheit(currentWeather.hourly.apparent_temperature[0])}°F` : 'Loading...'}
          </Typography>
          {/* Display response */}
          <TextField
            fullWidth
            multiline
            rows={10}
            value={response ? response : "Loading Recommendation..."}
            disabled
            variant="outlined"
            sx={{ mt: 2}} 
          />
        </Box>
      </Modal>
    </>
  );
};

export default RecommendationModal;

