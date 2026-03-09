import {initializeApp} from 'firebase-admin/app'
import {setGlobalOptions} from 'firebase-functions'

initializeApp()
setGlobalOptions({region: 'europe-west1', maxInstances: 10})

export {fetchWeather, scheduledFetchWeather} from './weather/fetchWeather.js'
export {getDailySuggestion} from './suggestion/getDailySuggestion.js'
export {crawlProductUrl} from './onboarding/crawlProductUrl.js'
export {submitFeedback} from './feedback/submitFeedback.js'
