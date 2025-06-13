<template>
  <div class="event-form-container">
    <h2>Create New Event</h2>
    <form @submit.prevent="submitForm" class="event-form">
      <div class="form-group">
        <label for="title">Title:</label>
        <input type="text" id="title" v-model="newEvent.title" required />
      </div>

      <div class="form-group">
        <label for="description">Description:</label>
        <textarea id="description" v-model="newEvent.description"></textarea>
      </div>

      <div class="form-group">
        <label for="startDateTime">Start Date/Time:</label>
        <input type="datetime-local" id="startDateTime" v-model="newEvent.startDateTime" required />
      </div>

      <div class="form-group">
        <label for="endDateTime">End Date/Time:</label>
        <input type="datetime-local" id="endDateTime" v-model="newEvent.endDateTime" required />
      </div>

      <button type="submit" class="submit-button">Add Event</button>
      <p
        v-if="message"
        class="message"
        :class="{ 'success-message': isSuccess, 'error-message': !isSuccess }"
      >
        {{ message }}
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Definiere das Event-Interface, passend zu deinem Backend
interface EventFormData {
  title: string
  description: string
  startDateTime: string
  endDateTime: string
}

// 1. Emits-Funktion definieren
const emits = defineEmits(['eventCreated']) // Definiere ein Event namens 'eventCreated'

const newEvent = ref<EventFormData>({
  title: '',
  description: '',
  startDateTime: '',
  endDateTime: '',
})

const message = ref<string>('')
const isSuccess = ref<boolean>(false)

// Funktion, die ausgelöst wird, wenn das Formular abgesendet wird
const submitForm = async () => {
  message.value = '' // Nachricht zurücksetzen

  try {
    // Verwendung der gleichen Umgebungsvariable wie in EventList.vue
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const url = `${backendUrl}/events`

    // Sendet die POST-Anfrage
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEvent.value), // Wandelt das Event-Objekt in einen JSON-String um
    })

    if (response.ok) {
      const createdEvent = await response.json()
      message.value = `Event "${createdEvent.title}" successfully created! (ID: ${createdEvent.id})`
      isSuccess.value = true
      // Formular zurücksetzen
      newEvent.value = {
        title: '',
        description: '',
        startDateTime: '',
        endDateTime: '',
      }
      // 2. Event emitieren, wenn ein Event erfolgreich erstellt wurde
      emits('eventCreated') // Signal senden
    } else {
      const errorData = await response.json()
      message.value = `Error creating event: ${errorData.message || response.statusText}`
      isSuccess.value = false
    }
  } catch (error) {
    console.error('Error submitting form:', error)
    message.value = 'Network error or unable to connect to backend.'
    isSuccess.value = false
  }
}
</script>

<style scoped>
.event-form-container {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.event-form .form-group {
  margin-bottom: 15px;
}

.event-form label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: bold;
}

.event-form input[type='text'],
.event-form input[type='datetime-local'],
.event-form textarea {
  width: calc(100% - 20px);
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.event-form textarea {
  resize: vertical;
  min-height: 80px;
}

.event-form input:focus,
.event-form textarea:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.submit-button {
  display: block;
  width: 100%;
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.submit-button:hover {
  background-color: #0056b3;
}

.message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
