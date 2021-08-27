'use strict';



// Class that contains data regarding workouts that is common to both running / cycling
class Workout{
    date = new Date();
    id = (Date.now() + ''.slice(-10)) // Create a unique id of current timestamp

    constructor(coords, distance, duration) {
        this.coords = coords; // array of latitude and longitude
        this.distance = distance; // km
        this.duration = duration; // min
    }

    //Method to create workout description
    _setDescription(){
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                            //Uppercase and rest so (Running)                       //get the month number from date
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }


}

// Workout Classes
class Running extends Workout{
    type = 'running'
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence; // steps per min
        this.calcPace(); // Call method in constructor
        this._setDescription();

    }

    //Calculate Pace method (min/km)
    calcPace(){
        this.pace = this.duration / this.distance;
        return this.pace;
    }

}

class Cycling extends Workout{
    type = 'cycling'; //define field (available on all instances)
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    // Calculate speed method (km/h)
    calcSpeed(){
        this.speed = this.distance / (this.duration / 60); //Convert to hr
        return this.speed;
     }
}



// ********************************** //
// APPLICATION CLASS//

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App{
    #map;
    #mapEvent;
    #workouts = [] //Empty workouts array
    // Call event handlers on constructor class to be called immediately
    constructor() {
        //Get user's position
        this._getPosition();

        //Get data from local storage
        this._getLocalStorage();

        // Event Listeners
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField)
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }


    // Method to get position, once obtained, call the load map function
    _getPosition(){
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition( this._loadMap.bind(this), function() {
                alert('Could not get your position.')
            });
        }
    }

    _loadMap(position){
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const coords = [latitude, longitude]

        // Load the map with the coordinates
        this.#map = L.map('map').setView(coords, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Once the map is laoded, call the show form method (Display workout options on left)
        this.#map.on('click', this._showForm.bind(this));

        // Render markers from local storage (We have to call it here because the map isn't loaded first)
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work)
        })

    }

    // Show the form on the left by removing hidden class
    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    //Hide the form after input is made
    _hideForm(){
        //Clear input fields
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none' //Set display to none to prevent from pushing list down
        form.classList.add('hidden');

        setTimeout(() => form.style.display = 'grid', 1000) // Set display back to grid after 1s
    }
    // Change the candace to elevation if cycling is the selected type
    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }

    // Create a new workout marker on the map
    _newWorkout(e){
        //Helper function

        // Function to loop over array and check if the number is finite (uses rest operator for arbitrary# arguments)
        // Rest operator makes it an array
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))

        //Function to check if all values are greater than 0
        const allPositive = function(...inputs){
            inputs.every(inp => Number(inp) > 0);
        }

        e.preventDefault()

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value; //Convert to Number using +
        const duration = +inputDuration.value;

        let workout;
        const{ lat, lng } = this.#mapEvent.latlng;


        //If workout = running, create running object
        if(type === 'running'){
            const cadence = Number(inputCadence.value)
            //Check if data is valid
            if(!validInputs(distance, duration, cadence) && !allPositive(distance, duration, cadence)) //If not valid inputs (invert the condition)
                return alert('Inputs must be positive numbers');

            //Create new Running object
             workout = new Running([lat, lng], distance, duration, cadence);
        }

        //If workout =  cycling, create cycling object
        if(type === 'cycling'){
            const elevation = +inputElevation.value;
            //Check if data is valid
            if(!validInputs(distance, duration, elevation) && !allPositive(distance, duration) )
                return alert('Inputs must be positive numbers');

            //Create new cycling object
            workout = new Cycling([lat, lng], distance, duration, elevation);

        }

        //Add new object to workout array
        this.#workouts.push(workout)

        //Render workout on map
        this._renderWorkoutMarker(workout)

        //Render workout on list
        this._renderWorkout(workout)

        //Hide forms and clear input fields
        this._hideForm();

        //Set local storage to all workouts (once user submits a workout)
        this._setLocalStorage();

    }

    _renderWorkoutMarker(workout){
        L.marker(workout.coords).addTo(this.#map) // get coordinates from workout object
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`, //Show running or cycling popup based on type
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`)
            .openPopup();
    }

    // Render the workout list on HTML (insert it as sibling of form)
    _renderWorkout(workout){

        //Default HTML Template for List
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                  <h2 class="workout__title">${workout.description}</h2>
                  <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚴'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                  </div>
                  <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                  </div>
        `
        // HTML Template Addition for Running
        if (workout.type === 'running'){
            html += `
                  <div class="workout__details">
                    <span class="workout__icon">⚡</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                  </div>
                  <div class="workout__details">
                    <span class="workout__icon">🦶</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                  </div>
                </li>
            `
        }

        //HTML Template Addition for Cycling
        if (workout.type == 'cycling'){
            html += `
                  <div class="workout__details">
                    <span class="workout__icon">⚡</span>
                    <span class="workout__value">${workout.speed.toFixed()}</span>
                    <span class="workout__unit">km/h</span>
                  </div>
                  <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                  </div>
                </li> 
            `
        }

        //Add the new element as a sibling of the form element
        form.insertAdjacentHTML('afterend', html);

    }

    // move map to workout marker using the specific workout ids created
    _moveToPopup(e){
        // element that is clicked, look for closest workout marker // target closest parent element
        const workoutEl = e.target.closest('.workout')

        //If no workout element
        if(!workoutEl) return; //Guard Clause

        //Find the workout that matches the workoutEl array (compare id)
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        //Move the map to the coordinates
        this.#map.setView(workout.coords, 13, {
            animate: true,
            pan: { // Animation Pan
                duration: 1
            }
        })

    }

    //Set local Storage
    _setLocalStorage(){
        //Local Storage API             //Convert obj to string
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
    }

    //Get local storage
    _getLocalStorage(){
        //Convert str to obj //Get the workouts from string
        const data = JSON.parse(localStorage.getItem('workouts'));

        //Check if there is data
        if(!data) return;

        this.#workouts = data; //set the workouts to the read data

        //Render the current workout (loop through workouts arrow and render workout using method)
        this.#workouts.forEach(work => {
            this._renderWorkout(work)
        })

    }

    //Remove from local storage
    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }


}
const app = new App();






