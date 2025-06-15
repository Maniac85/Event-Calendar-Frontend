<template>
  <div class="event-form-container">
    <h2>{{ formTitle }}</h2>
    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="title">Title:</label>
        <input type="text" id="title" v-model="newEvent.title" required />
      </div>

      <div class="form-group">
        <label for="description">Description:</label>
        <textarea id="description" v-model="newEvent.description"></textarea>
      </div>

      <div class="form-group">
        <label for="startDateTime">Start Date & Time:</label>
        <input type="datetime-local" id="startDateTime" v-model="newEvent.startDateTime" required />
      </div>

      <div class="form-group">
        <label for="endDateTime">End Date & Time:</label>
        <input type="datetime-local" id="endDateTime" v-model="newEvent.endDateTime" required />
      </div>

      <button type="submit">{{ props.eventId ? 'Update Event' : 'Add Event' }}</button>
      <button v-if="props.eventId" type="button" @click="resetForm" class="cancel-button">
        Cancel Edit
      </button>

      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

// Definiert die Ereignisse (Emits), die diese Komponente an ihre Elternkomponente senden kann.
// 'eventSubmitted' wird ausgelöst, wenn ein Event erfolgreich erstellt oder aktualisiert wurde.
const emits = defineEmits(['eventSubmitted'])

// Definiert die Eigenschaften (Props), die diese Komponente von ihrer Elternkomponente empfangen kann.
interface Props {
  // Die ID des zu bearbeitenden Events. Ist null, wenn ein neues Event erstellt werden soll.
  eventId: number | null
}
const props = defineProps<Props>()

// Definiert die Struktur eines Event-Objekts.
interface Event {
  // Die ID ist optional, da sie beim Erstellen eines neuen Events vom Backend generiert wird.
  id?: number
  title: string
  description: string
  startDateTime: string
  endDateTime: string
}

// Eine reaktive Variable, die die Daten des Event-Formulars speichert.
// Initialisiert mit leeren Werten für ein neues Event.
const newEvent = ref<Event>({
  title: '',
  description: '',
  startDateTime: '',
  endDateTime: '',
})

// Reaktive Variablen zum Speichern von Erfolgs- und Fehlermeldungen.
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// Setzt die Formularfelder und die Nachrichten (Erfolg/Fehler) auf ihren Initialzustand zurück.
const resetForm = () => {
  newEvent.value = {
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
  }
  successMessage.value = null
  errorMessage.value = null
}

// Lädt die Details eines Events vom Backend basierend auf seiner ID.
// Die geladenen Daten werden verwendet, um das Formular vorab auszufüllen.
const fetchEventById = async (id: number) => {
  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const response = await fetch(`${backendUrl}/events/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch event with ID ${id}: ${response.status}`)
    }
    const data = await response.json()
    // Die empfangenen Event-Daten werden in die reaktive Variable 'newEvent' geladen.
    // Datum/Uhrzeit-Werte werden ins korrekte Format für den 'datetime-local'-Input konvertiert.
    newEvent.value = {
      id: data.id,
      title: data.title,
      description: data.description,
      startDateTime: data.startDateTime
        ? new Date(data.startDateTime).toISOString().slice(0, 16)
        : '',
      endDateTime: data.endDateTime ? new Date(data.endDateTime).toISOString().slice(0, 16) : '',
    }
    errorMessage.value = null // Entfernt frühere Fehlermeldungen nach erfolgreichem Laden.
  } catch (error: any) {
    console.error('Error fetching event:', error)
    errorMessage.value = `Error loading event: ${error.message}`
    resetForm() // Setzt das Formular zurück, falls beim Laden ein Fehler auftritt.
  }
}

// Überwacht Änderungen an der 'eventId'-Prop.
// Diese Funktion wird jedes Mal ausgeführt, wenn sich der Wert von 'props.eventId' ändert.
watch(
  () => props.eventId,
  (newId) => {
    if (newId) {
      // Wenn 'eventId' eine Zahl (d.h. eine Event-ID) ist, lade die Event-Daten ins Formular.
      fetchEventById(newId)
    } else {
      // Wenn 'eventId' null ist (z.B. für ein neues Event oder nach dem Abbrechen der Bearbeitung),
      // setze das Formular zurück.
      resetForm()
    }
  },
  { immediate: true },
) // 'immediate: true' sorgt dafür, dass der Watcher einmal direkt beim Start der Komponente ausgeführt wird.

// Eine berechnete Eigenschaft (Computed Property) für den Titel des Formulars.
// Der Titel ändert sich dynamisch, je nachdem ob ein Event bearbeitet oder ein neues Event hinzugefügt wird.
const formTitle = computed(() => {
  return props.eventId ? 'Edit Event' : 'Add New Event'
})

// Verarbeitet das Absenden des Formulars.
// Sendet entweder einen POST-Request (neues Event) oder einen PUT-Request (Event aktualisieren) an das Backend.
const submitForm = async () => {
  successMessage.value = null // Setzt Erfolgsmeldungen zurück.
  errorMessage.value = null // Setzt Fehlermeldungen zurück.

  // Grundlegende Validierung: Prüft, ob Pflichtfelder ausgefüllt sind.
  if (!newEvent.value.title || !newEvent.value.startDateTime || !newEvent.value.endDateTime) {
    errorMessage.value = 'Title, Start Date/Time, and End Date/Time are required.'
    return
  }

  // Validierung: Prüft, ob die Endzeit nach der Startzeit liegt.
  if (
    new Date(newEvent.value.startDateTime).getTime() >=
    new Date(newEvent.value.endDateTime).getTime()
  ) {
    errorMessage.value = 'End date/time must be after start date/time.'
    return
  }

  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    let url = `${backendUrl}/events` // Standard-URL für POST-Requests.
    let method = 'POST' // Standardmethode für neue Events.

    // Wenn 'props.eventId' vorhanden ist, handelt es sich um eine Aktualisierung (PUT-Request).
    if (props.eventId) {
      url = `${backendUrl}/events/${props.eventId}` // URL für das spezifische Event.
      method = 'PUT' // Methode für die Aktualisierung.
    }

    // Führt den Fetch-Request an das Backend aus.
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json', // Gibt an, dass der Body im JSON-Format gesendet wird.
      },
      // Der Request-Body enthält die Event-Daten.
      // Beim PUT-Request wird das gesamte 'newEvent.value'-Objekt gesendet (inkl. ID).
      // Beim POST-Request wird ein neues Objekt ohne ID gesendet, da das Backend die ID generiert.
      body: JSON.stringify(
        props.eventId
          ? newEvent.value
          : {
              title: newEvent.value.title,
              description: newEvent.value.description,
              startDateTime: newEvent.value.startDateTime,
              endDateTime: newEvent.value.endDateTime,
            },
      ),
    })

    if (response.ok) {
      // Bestimmt, ob ein Event aktualisiert oder neu erstellt wurde, für die Erfolgsmeldung.
      const action = props.eventId ? 'updated' : 'created'
      successMessage.value = `Event successfully ${action}!`
      resetForm() // Setzt das Formular nach erfolgreichem Absenden zurück.
      emits('eventSubmitted') // Informiert die Elternkomponente über die erfolgreiche Übermittlung.
    } else {
      // Bei einem Fehler wird die Fehlermeldung vom Backend gelesen und angezeigt.
      const errorData = await response.text()
      errorMessage.value = `Error ${method === 'POST' ? 'adding' : 'updating'} event: ${response.status} - ${errorData}`
      console.error('API Error:', response.status, errorData)
    }
  } catch (error: any) {
    // Behandelt Netzwerkfehler (z.B. Backend nicht erreichbar).
    errorMessage.value = `Network error: ${error.message}`
    console.error('Fetch error:', error)
  }
}
</script>

<style scoped>
/* Container für das gesamte Formular */
.event-form-container {
  max-width: 600px; /* Maximale Breite des Formulars */
  margin: 20px auto; /* Zentriert das Formular auf der Seite mit vertikalem Abstand */
  padding: 20px;
  background-color: #f0f8ff; /* Hintergrundfarbe des Formulars (Hellblau) */
  border-radius: 8px; /* Abgerundete Ecken */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Leichter Schatten */
}

/* Stil für die Formularüberschrift */
h2 {
  color: #0056b3; /* Blauer Text */
  text-align: center;
  margin-bottom: 20px;
}

/* Abstand zwischen den Formularfeldern */
.form-group {
  margin-bottom: 15px;
}

/* Stil für die Beschriftungen (Labels) der Formularfelder */
label {
  display: block; /* Stellt sicher, dass das Label eine eigene Zeile einnimmt */
  margin-bottom: 5px;
  color: #333;
  font-weight: bold;
}

/* Stil für Textfelder, Datum/Uhrzeit-Felder und Textbereiche */
input[type='text'],
input[type='datetime-local'],
textarea {
  width: calc(100% - 22px); /* Breite unter Berücksichtigung von Padding und Border */
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
}

/* Spezifischer Stil für Textbereiche */
textarea {
  resize: vertical; /* Erlaubt dem Benutzer, die Höhe des Textbereichs zu ändern */
  min-height: 80px;
}

/* Stil für den "Add Event" / "Update Event" Button */
button[type='submit'] {
  background-color: #28a745; /* Grüner Hintergrund */
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition:
    background-color 0.2s,
    transform 0.1s; /* Sanfter Übergang bei Hover */
  margin-right: 10px; /* Abstand zum "Cancel Edit" Button */
}

/* Hover-Effekt für den Submit-Button */
button[type='submit']:hover {
  background-color: #218838; /* Dunkleres Grün bei Hover */
  transform: translateY(-1px); /* Leichte Anhebung bei Hover */
}

/* Stil für den "Cancel Edit" Button */
.cancel-button {
  background-color: #6c757d; /* Grauer Hintergrund */
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition:
    background-color 0.2s,
    transform 0.1s; /* Sanfter Übergang bei Hover */
}

/* Hover-Effekt für den Cancel-Button */
.cancel-button:hover {
  background-color: #5a6268; /* Dunkleres Grau bei Hover */
  transform: translateY(-1px); /* Leichte Anhebung bei Hover */
}

/* Stil für Erfolgsmeldungen */
.success-message {
  color: green;
  margin-top: 15px;
  text-align: center;
}

/* Stil für Fehlermeldungen */
.error-message {
  color: red;
  margin-top: 15px;
  text-align: center;
}
</style>
