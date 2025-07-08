'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader, Target } from 'lucide-react'

export default function LocationPicker({ 
  onLocationSelect, 
  initialLocation = '', 
  disabled = false 
}) {
  const [address, setAddress] = useState(initialLocation)
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false)
  
  const autocompleteService = useRef(null)
  const geocoder = useRef(null)
  const debounceTimeout = useRef(null)

  useEffect(() => {
    // Initialize Google Maps services when component mounts
    if (window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      geocoder.current = new window.google.maps.Geocoder()
    }
  }, [])

  const handleAddressChange = (e) => {
    const value = e.target.value
    setAddress(value)
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    
    debounceTimeout.current = setTimeout(() => {
      if (value.length > 2 && autocompleteService.current) {
        fetchSuggestions(value)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)
  }

  const fetchSuggestions = (input) => {
    setIsLoading(true)
    
    const request = {
      input,
      componentRestrictions: { country: 'de' }, // Restrict to Germany
      types: ['address', 'establishment', 'geocode']
    }

    autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
      setIsLoading(false)
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setSuggestions(predictions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    })
  }

  const handleSuggestionSelect = (suggestion) => {
    setAddress(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    
    // Get coordinates for the selected address
    if (geocoder.current) {
      geocoder.current.geocode(
        { address: suggestion.description },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location
            onLocationSelect({
              address: suggestion.description,
              latitude: location.lat(),
              longitude: location.lng(),
              placeId: suggestion.place_id
            })
          }
        }
      )
    } else {
      // Fallback if geocoder is not available
      onLocationSelect({
        address: suggestion.description,
        placeId: suggestion.place_id
      })
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation wird von diesem Browser nicht unterstützt')
      return
    }

    setGettingCurrentLocation(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        
        // Reverse geocode to get address
        if (geocoder.current) {
          geocoder.current.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setGettingCurrentLocation(false)
              
              if (status === 'OK' && results[0]) {
                const address = results[0].formatted_address
                setAddress(address)
                onLocationSelect({
                  address,
                  latitude,
                  longitude,
                  placeId: results[0].place_id
                })
              } else {
                // Fallback to coordinates only
                setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                onLocationSelect({
                  address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  latitude,
                  longitude
                })
              }
            }
          )
        } else {
          setGettingCurrentLocation(false)
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          onLocationSelect({
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude
          })
        }
      },
      (error) => {
        setGettingCurrentLocation(false)
        let errorMessage = 'Fehler beim Abrufen der Position'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Standort-Berechtigung wurde verweigert'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Standort-Information nicht verfügbar'
            break
          case error.TIMEOUT:
            errorMessage = 'Zeitüberschreitung beim Abrufen der Position'
            break
        }
        
        alert(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  return (
    <div className="relative">
      <div className="flex">
        <div className="flex-1 relative">
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow selection
              setTimeout(() => setShowSuggestions(false), 150)
            }}
            placeholder="Adresse eingeben..."
            disabled={disabled}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader size={16} className="animate-spin text-gray-400" />
            </div>
          )}
          
          {!isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <MapPin size={16} className="text-gray-400" />
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={disabled || gettingCurrentLocation}
          className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          title="Aktuellen Standort verwenden"
        >
          {gettingCurrentLocation ? (
            <Loader size={16} className="animate-spin text-gray-500" />
          ) : (
            <Target size={16} className="text-gray-500" />
          )}
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
            >
              <div className="flex items-start">
                <MapPin size={16} className="text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {suggestion.structured_formatting?.main_text || suggestion.description}
                  </div>
                  {suggestion.structured_formatting?.secondary_text && (
                    <div className="text-xs text-gray-500">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}