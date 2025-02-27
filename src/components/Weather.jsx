import React, { useEffect, useState } from 'react'
import './Weather.css'

import clear_icon from "../assets/clear.png";
import cloud_icon from "../assets/cloud.png";
import drizzle_icon from "../assets/drizzle.png";
import rain_icon from "../assets/rain.png";
import snow_icon from "../assets/snow.png";
import wind_icon from "../assets/wind.png";
import humidity_icon from "../assets/humidity.png";

const Weather = () => {
  //https://api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}
  const [search,setSearch]= useState("chennai");
  const [city,setCity] = useState(null);
  const getWeatherData = async()=>{   //promise return 
    let response = await fetch(  
      `https://api.openweathermap.org/data/2.5/weather?q=${search}&appid=24055e17098205e804e150c5608803d3&units=metric`);
      let result =await response.json();
setCity(result)
     
  }

useEffect(()=>{
     getWeatherData();
},[search])


  return (
    <div className="weather">
      <div className="search-bar">
        <input
          type="text"
          placeholder="search"
          spellCheck="false"
          onChange={(e) => setSearch(e.target.value)} //onChange is not a function it's a Event in js
        />
        
      </div>
      <img src={clear_icon} alt="" className="weather-icon" />
      <p className="temperature">{city?.main?.temp}°C</p>
      <p className="location">{city?.name}</p>
      <div className="weather-data">
        <div className="col">
          <img src={humidity_icon} alt="" />
          <div>
            <p> {city?.main?.humidity}%</p>
            <span>Humidity</span>
          </div>
        </div>
        <div className="col">
          <img src={wind_icon} alt="" />
          <div>
            <p>{city?.wind?.speed} Km/h</p>
            <span>Wind Speed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather