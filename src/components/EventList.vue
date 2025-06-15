<template>
  <div class="event-list-container">
    <h2>Events</h2>
    <ul class="event-list">
      <li v-for="event in events" :key="event.id" class="event-item">
        <div class="event-details">
          <h3>{{ event.title }}</h3>
          <p><strong>Description:</strong> {{ event.description }}</p>
          <p><strong>Start:</strong> {{ new Date(event.startDateTime).toLocaleString() }}</p>
          <p><strong>End:</strong> {{ new Date(event.endDateTime).toLocaleString() }}</p>
        </div>
        <div class="event-actions">
          <button @click="confirmDelete(event.id, event.title)" class="delete-button">
            Delete
          </button>
        </div>
      </li>
    </ul>
    <p v-if="events.length === 0">No events found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Event {
  id: number //  Or number if your backend sends numbers
  title: string
  description: string
  startDateTime: string //  Or string if that's what the backend sends
  endDateTime: string //  Or string
}

const events = ref<Event[]>([]) //  events is an array of Event objects

// Die fetchData-Funktion in eine separate Funktion auslagern
const fetchEvents = async () => {
  console.log('--- Fetching events ---')
  try {
    // Verwende die korrekte Umgebungsvariable
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL // Vite erkennt diese automatisch

    // Fallback für lokale Entwicklung, falls Variable nicht gesetzt ist (obwohl .env.development es tun sollte)
    const urlToFetch = backendUrl || 'http://localhost:8080'
    const response = await fetch(`${urlToFetch}/events`)
    console.log('Response:', response)
    console.log('Response Status:', response.status)
    if (!response.ok) {
      console.error('HTTP error!', response.status)
      return // Stop if there's an error
    }
    const data = await response.json()
    console.log('Data:', data)
    events.value = data as Event[]
    console.log('Events.value:', events.value)
  } catch (error) {
    console.error('Fetch error:', error)
  }
  console.log('--- Fetching complete ---')
}
// NEU: Funktion zum Bestätigen und Löschen eines Events
const confirmDelete = async (id: number, title: string) => {
  if (confirm(`Are you sure you want to delete the event "${title}" (ID: ${id})?`)) {
    await deleteEvent(id)
  }
}

// NEU: Funktion zum Senden der DELETE-Anfrage an das Backend
const deleteEvent = async (id: number) => {
  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const url = `${backendUrl}/events/${id}`

    const response = await fetch(url, {
      method: 'DELETE',
    })

    if (response.ok) {
      console.log(`Event with ID ${id} successfully deleted.`)
      // Nach erfolgreichem Löschen die Liste aktualisieren
      await fetchEvents()
    } else {
      const errorText = await response.text() // Text statt JSON lesen, da 204 No Content keinen Body hat
      console.error(`Error deleting event with ID ${id}: ${response.status} - ${errorText}`)
      alert(`Failed to delete event: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('Network error during delete:', error)
    alert('Network error or unable to connect to backend.')
  }
}
onMounted(fetchEvents) // Beim Mounten einmal Events laden

// 1. Die fetchEvents-Funktion nach außen exponieren
defineExpose({
  fetchEvents, // Macht die fetchEvents-Funktion von außerhalb der Komponente zugänglich
})
</script>
<style scoped>
/* Gesamtcontainer für die Event-Liste */
.event-list-container {
  max-width: 800px; /* Maximale Breite der Liste */
  margin: 20px auto; /* Zentrierung auf der Seite mit Abstand oben/unten */
  padding: 20px;
  background-color: #f9f9f9; /* Heller Hintergrund */
  border-radius: 8px; /* Abgerundete Ecken */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Leichter Schatten für Tiefe */
}

/* Überschrift der Liste */
h2 {
  color: #333; /* Dunkler Text */
  text-align: center;
  margin-bottom: 20px;
}

/* Allgemeine Liste der Events */
.event-list {
  list-style: none; /* Entfernt die Standard-Aufzählungspunkte */
  padding: 0; /* Entfernt den Standard-Padding */
}

/* Einzelnes Event-Element in der Liste */
.event-item {
  background-color: white; /* Weißer Hintergrund für jedes Event */
  border: 1px solid #ddd; /* Leichter Rand */
  border-radius: 6px; /* Abgerundete Ecken */
  margin-bottom: 15px; /* Abstand zwischen den Events */
  padding: 15px;
  display: flex; /* Flexbox für die Anordnung von Details und Buttons */
  justify-content: space-between; /* Details links, Buttons rechts */
  align-items: center; /* Vertikale Zentrierung der Inhalte */
  transition: transform 0.2s ease-in-out; /* Sanfte Hover-Animation */
}

.event-item:hover {
  transform: translateY(-2px); /* Hebt das Element beim Hovern leicht an */
}

/* Container für die Event-Details (Titel, Beschreibung, Zeiten) */
.event-details {
  flex-grow: 1; /* Lässt die Details den verfügbaren Platz einnehmen */
  margin-right: 20px; /* Abstand zu den Buttons */
}

/* Titel des Events */
.event-item h3 {
  color: #0056b3; /* Blauer Titel */
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 1.2em; /* Etwas größerer Titel */
}

/* Absätze für Beschreibung und Zeiten */
.event-item p {
  margin-bottom: 5px;
  color: #555; /* Grauer Text */
  line-height: 1.4;
}

.event-item p:last-child {
  margin-bottom: 0; /* Kein Bodenabstand für den letzten Absatz */
}

/* Container für die Aktions-Buttons (Edit, Delete) */
.event-actions {
  display: flex;
  gap: 10px; /* Abstand zwischen den Buttons */
}

/* Allgemeine Button-Stile für Buttons innerhalb von event-item */
.event-item button {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

/* Spezifischer Stil für den Delete-Button */
.delete-button {
  background-color: #dc3545; /* Rot */
  color: white;
}

.delete-button:hover {
  background-color: #c82333; /* Dunkleres Rot */
  transform: translateY(-1px); /* Leichte Anhebung beim Hover */
}
</style>
