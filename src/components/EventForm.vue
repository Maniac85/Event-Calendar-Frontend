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
      <button v-if="props.eventId" type="button" @click="onCancelEdit" class="cancel-button">
        Cancel Edit
      </button>

      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineExpose } from 'vue'

/**
 * @module EventForm
 * @description
 * Komponente zum Hinzufügen neuer Events und zum Bearbeiten bestehender Events.
 * Verwaltet das Formular, sendet Daten an das Backend und zeigt Statusmeldungen an.
 */

/**
 * @interface Event
 * @description Definition der Struktur eines Event-Objekts.
 * @property {number} [id] - Die optionale ID des Events (vorhanden bei Bearbeitung, nicht bei Neuanlage).
 * @property {string} title - Der Titel des Events.
 * @property {string} description - Die Beschreibung des Events.
 * @property {string} startDateTime - Das Startdatum und die Startzeit des Events (ISO 8601 Format).
 * @property {string} endDateTime - Das Enddatum und die Endzeit des Events (ISO 8601 Format).
 * @property {boolean} isCompleted - Zeigt an, ob das Event abgeschlossen ist.
 */
interface Event {
  id?: number
  title: string
  description: string
  startDateTime: string
  endDateTime: string
  isCompleted: boolean
}

/**
 * @interface EventFormProps
 * @description Definition der Props, die diese Komponente von der Elternkomponente (HomeView) erhält.
 * @property {number | null} eventId - Die ID des Events, das bearbeitet werden soll. `null` bedeutet, dass ein neues Event hinzugefügt wird.
 */
interface EventFormProps {
  eventId: number | null
}
const props = defineProps<EventFormProps>()

/**
 * @interface EventFormEmits
 * @description Definition der Emits, die diese Komponente an die Elternkomponente sendet.
 * @property {() => void} eventSubmitted - Wird ausgelöst, wenn ein Event erfolgreich hinzugefügt oder aktualisiert wurde.
 * @property {() => void} cancelEdit - Wird ausgelöst, wenn der "Cancel Edit"-Button geklickt wird.
 */
interface EventFormEmits {
  (e: 'eventSubmitted'): void
  (e: 'cancelEdit'): void
}
const emits = defineEmits<EventFormEmits>()

/**
 * @property {ref<Event>} newEvent
 * @description Ein reaktiver Referenz auf das Event-Objekt, das an das Formular gebunden ist.
 * Enthält die Daten des aktuell angezeigten/bearbeiteten Events.
 */
const newEvent = ref<Event>({
  title: '',
  description: '',
  startDateTime: '',
  endDateTime: '',
  isCompleted: false,
})

/**
 * @property {ref<string | null>} successMessage
 * @description Eine reaktive Referenz für Erfolgsmeldungen, die dem Benutzer angezeigt werden.
 */
const successMessage = ref<string | null>(null)

/**
 * @property {ref<string | null>} errorMessage
 * @description Eine reaktive Referenz für Fehlermeldungen, die dem Benutzer angezeigt werden.
 */
const errorMessage = ref<string | null>(null)

/**
 * @function resetForm
 * @description Setzt das Formular auf seinen Initialzustand zurück (leert alle Felder).
 * @returns {void}
 */
const resetForm = () => {
  newEvent.value = {
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    isCompleted: false,
  }
  successMessage.value = null
  errorMessage.value = null
}

/**
 * @function onCancelEdit
 * @description Behandelt das Klicken des "Cancel Edit"-Buttons.
 * Emittiert das `cancelEdit`-Event an die Elternkomponente.
 * Das eigentliche Zurücksetzen des Formulars wird von der Elternkomponente
 * über die `resetAndLoad`-Methode gesteuert.
 * @returns {void}
 */
const onCancelEdit = () => {
  console.log('EventForm: Cancel Edit geklickt, emittiere "cancelEdit".')
  emits('cancelEdit')
}

/**
 * @function fetchEventById
 * @description Ruft ein einzelnes Event anhand seiner ID vom Backend ab und füllt das Formular damit.
 * @async
 * @param {number} id - Die ID des abzurufenden Events.
 * @returns {Promise<void>}
 */
const fetchEventById = async (id: number) => {
  console.log('EventForm: Lade Event mit ID:', id)
  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    const response = await fetch(`${backendUrl}/events/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch event with ID ${id}: ${response.status}`)
    }
    const data = await response.json()
    // Daten in das Formular laden. Datumsfelder korrekt formatieren (ISO-String für datetime-local)
    newEvent.value = {
      id: data.id,
      title: data.title,
      description: data.description,
      startDateTime: data.startDateTime
        ? new Date(data.startDateTime).toISOString().slice(0, 16)
        : '',
      endDateTime: data.endDateTime ? new Date(data.endDateTime).toISOString().slice(0, 16) : '',
      isCompleted: data.isCompleted || false,
    }
    errorMessage.value = null
  } catch (error: any) {
    console.error('EventForm: Fehler beim Abrufen des Events:', error)
    errorMessage.value = `Error loading event: ${error.message}`
    resetForm() // Formular bei Fehler zurücksetzen
  }
}

/**
 * @description
 * Beobachtet Änderungen des `eventId`-Props. Wenn sich die ID ändert,
 * wird entweder das entsprechende Event geladen (wenn ID vorhanden)
 * oder das Formular zurückgesetzt (wenn ID null ist).
 * Der `immediate: true`-Modus sorgt dafür, dass dieser Watcher auch beim
 * initialen Rendern der Komponente einmal läuft.
 */
watch(
  () => props.eventId,
  (newId) => {
    console.log('EventForm: eventId Prop geändert zu:', newId)
    // Die Logik von `resetAndLoad` wird hier dupliziert, da der Watcher
    // der primäre Weg ist, wie das Formular auf Änderungen der Prop reagiert.
    // `resetAndLoad` dient als explizite Methode für die Elternkomponente.
    if (newId) {
      fetchEventById(newId)
    } else {
      resetForm()
    }
  },
  { immediate: true }, // Sorgt dafür, dass der Watcher auch beim Laden der Komponente einmalig läuft
)

/**
 * @property {ComputedRef<string>} formTitle
 * @description Ein Computed Property, das den Titel des Formulars basierend auf dem `eventId` generiert.
 * Zeigt "Edit Event" an, wenn eine Event-ID vorhanden ist, sonst "Add New Event".
 */
const formTitle = computed(() => {
  return props.eventId ? 'Edit Event' : 'Add New Event'
})

/**
 * @function submitForm
 * @description Behandelt das Absenden des Formulars (Hinzufügen oder Aktualisieren eines Events).
 * Führt Validierungen durch und sendet die Daten an das Backend.
 * @async
 * @returns {Promise<void>}
 */
const submitForm = async () => {
  successMessage.value = null
  errorMessage.value = null

  // Basis-Validierung: Titel, Start- und Endzeit sind Pflichtfelder
  if (!newEvent.value.title || !newEvent.value.startDateTime || !newEvent.value.endDateTime) {
    errorMessage.value = 'Title, Start Date/Time, and End Date/Time are required.'
    return
  }

  // Validierung: Endzeit muss nach Startzeit liegen
  if (
    new Date(newEvent.value.startDateTime).getTime() >=
    new Date(newEvent.value.endDateTime).getTime()
  ) {
    errorMessage.value = 'End date/time must be after start date/time.'
    return
  }

  try {
    const backendUrl = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8080'
    let url = `${backendUrl}/events`
    let method = 'POST'
    let bodyData: Event

    // Prüfen, ob wir ein bestehendes Event aktualisieren oder ein neues hinzufügen
    if (props.eventId) {
      // Aktualisieren
      url = `${backendUrl}/events/${props.eventId}`
      method = 'PUT'
      bodyData = { ...newEvent.value } // Alle aktuellen Formularwerte
    } else {
      // Hinzufügen
      bodyData = {
        title: newEvent.value.title,
        description: newEvent.value.description,
        startDateTime: newEvent.value.startDateTime,
        endDateTime: newEvent.value.endDateTime,
        isCompleted: false, // Standardmäßig ist ein neues Event nicht abgeschlossen
      } as Event // Type assertion, da `id` hier nicht vorhanden ist
    }

    // API-Aufruf
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    })

    if (response.ok) {
      const action = props.eventId ? 'updated' : 'created'
      successMessage.value = `Event successfully ${action}!`
      resetForm() // Formular nach erfolgreichem Submit zurücksetzen
      emits('eventSubmitted') // Elternkomponente benachrichtigen
    } else {
      const errorData = await response.text()
      errorMessage.value = `Error ${method === 'POST' ? 'adding' : 'updating'} event: ${response.status} - ${errorData}`
      console.error('EventForm: API Error:', response.status, errorData)
    }
  } catch (error: any) {
    errorMessage.value = `Network error: ${error.message}`
    console.error('EventForm: Fetch error:', error)
  }
}

/**
 * @function resetAndLoad
 * @description Eine Methode, die von der Elternkomponente (HomeView) aufgerufen werden kann,
 * um das Formular entweder zu leeren oder ein spezifisches Event zu laden.
 * Wird verwendet, um das "Cancel Edit"-Verhalten und das erneute Laden desselben
 * Events zuverlässig zu steuern, indem es den `watch`-Hook von außen triggert.
 * @param {number | null} id - Die ID des Events, das geladen werden soll. `null` zum Zurücksetzen.
 * @returns {void}
 */
const resetAndLoad = (id: number | null) => {
  console.log('EventForm: resetAndLoad aufgerufen mit ID:', id)
  if (id) {
    fetchEventById(id)
  } else {
    resetForm()
  }
}

/**
 * @expose resetAndLoad
 * @description Macht die `resetAndLoad`-Funktion für die Elternkomponente zugänglich,
 * sodass `HomeView` sie über `eventFormRef.value?.resetAndLoad()` aufrufen kann.
 */
defineExpose({
  resetAndLoad,
})
</script>

<style scoped>
/* Container für das gesamte Formular */
.event-form-container {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  background-color: #f0f8ff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Stil für die Formularüberschrift */
h2 {
  color: #0056b3;
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
  font-weight: bold; /* Macht die Labels fett */
}

/* Stil für Textfelder, Datum/Uhrzeit-Felder und Textbereiche */
input[type='text'],
input[type='datetime-local'],
textarea {
  width: calc(100% - 22px); /* Volle Breite minus Padding und Border */
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
}

/* Spezifischer Stil für Textbereiche (ermöglicht Größenänderung vertikal) */
textarea {
  resize: vertical;
  min-height: 80px;
}

/* Stil für den "Add Event" / "Update Event" Button */
button[type='submit'] {
  background-color: #28a745;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition:
    background-color 0.2s,
    transform 0.1s; /* Sanfte Übergänge beim Hover */
  margin-right: 10px; /* Abstand zum Cancel-Button */
}

/* Hover-Effekt für den Submit-Button */
button[type='submit']:hover {
  background-color: #218838;
  transform: translateY(-1px); /* Leichter "Pop-up"-Effekt */
}

/* Stil für den "Cancel Edit" Button */
.cancel-button {
  background-color: #6c757d;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

/* Hover-Effekt für den Cancel-Button */
.cancel-button:hover {
  background-color: #5a6268;
  transform: translateY(-1px);
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
