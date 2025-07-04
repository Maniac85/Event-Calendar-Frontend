// src/components/__tests__/EventForm.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EventForm from '../EventForm.vue' // Import der zu testenden Komponente
import { nextTick } from 'vue'

// Mocken der Umgebungsvariable VITE_APP_API_BASE_URL
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_APP_API_BASE_URL: 'http://localhost:8080', // Oder eine andere URL
    },
  },
})

// Mock-Daten für Events, wenn ein Event geladen werden soll
const mockEventToEdit = {
  id: 1,
  title: 'Existing Event',
  description: 'Existing Description',
  startDateTime: '2025-07-01T09:00:00',
  endDateTime: '2025-07-01T10:00:00',
  isCompleted: false,
}

// Den globalen `fetch` durch einen Vitest-Mock ersetzen
beforeEach(() => {
  vi.clearAllMocks() // Wichtig: Mocks vor jedem Test zurücksetzen

  global.fetch = vi.fn((url, options?) => {
    if (url === 'http://localhost:8080/events') {
      if (options?.method === 'POST') {
        // Erfolgreicher POST für neues Event
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 3, ...JSON.parse(options.body as string) }), // Simuliert neues Event
        }) as Promise<Response>
      }
    } else if (url === `http://localhost:8080/events/${mockEventToEdit.id}`) {
      if (options?.method === 'GET') {
        // Erfolgreicher GET für bestehendes Event
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEventToEdit),
        }) as Promise<Response>
      } else if (options?.method === 'PUT') {
        // Erfolgreicher PUT für Update
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ ...JSON.parse(options.body as string), id: mockEventToEdit.id }),
        }) as Promise<Response>
      }
    }
    return Promise.reject(new Error(`Unhandled fetch request: ${url}`))
  })

  // Mocken Sie setTimeout, da es in der Komponente verwendet wird (z.B. für Success/Error-Messages)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers() // Setzt die Timer nach jedem Test zurück, um Konflikte zu vermeiden
})

describe('EventForm.vue', () => {
  it('renders correctly for adding a new event', async () => {
    const wrapper = mount(EventForm, { props: { eventId: null } })

    expect(wrapper.find('h2').text()).toBe('Add New Event')
    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Add Event')
    expect(wrapper.find('.cancel-button').exists()).toBe(false) // Cancel-Button sollte nicht da sein
  })

  it('renders correctly for editing an existing event', async () => {
    const wrapper = mount(EventForm, { props: { eventId: mockEventToEdit.id } })

    // Die Komponente ruft fetchEventById beim Mounten/watch auf
    await nextTick() // Warten auf Prop-Watch und initialen fetch
    await nextTick() // Zusätzlicher nextTick für fetch-Resultat und DOM-Update

    expect(global.fetch).toHaveBeenCalledWith(`http://localhost:8080/events/${mockEventToEdit.id}`)
    expect(wrapper.find('h2').text()).toBe('Edit Event')
    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe(mockEventToEdit.title)
    expect(wrapper.find('button[type="submit"]').text()).toBe('Update Event')
    expect(wrapper.find('.cancel-button').exists()).toBe(true)
  })

  it('submits a new event and emits eventSubmitted', async () => {
    const wrapper = mount(EventForm, { props: { eventId: null } })

    await wrapper.find('#title').setValue('New Event Title')
    await wrapper.find('#description').setValue('New Event Description')
    await wrapper.find('#startDateTime').setValue('2025-07-06T10:00')
    await wrapper.find('#endDateTime').setValue('2025-07-06T11:00')

    await wrapper.find('form').trigger('submit')

    // Überprüfen, ob fetch mit POST aufgerufen wurde
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Event Title',
          description: 'New Event Description',
          startDateTime: '2025-07-06T10:00',
          endDateTime: '2025-07-06T11:00',
          isCompleted: false, // Standardwert
        }),
      }),
    )

    await nextTick() // Warten auf DOM-Update nach erfolgreicher Übermittlung

    // Überprüfen, ob eventSubmitted emittiert wurde
    expect(wrapper.emitted('eventSubmitted')).toBeTruthy()
    // Überprüfen, ob das Formular zurückgesetzt wurde
    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('.success-message').text()).toContain('Event successfully added!')

    vi.runAllTimers() // Fortschreiten der setTimeout-Uhrzeit, um Meldungen zu entfernen
    await nextTick()
    expect(wrapper.find('.success-message').exists()).toBe(false)
  })

  it('updates an existing event and emits eventSubmitted', async () => {
    const wrapper = mount(EventForm, { props: { eventId: mockEventToEdit.id } })
    await nextTick() // initialer fetchEventById
    await nextTick() // DOM Update nach fetch

    await wrapper.find('#title').setValue('Updated Event Title')
    await wrapper.find('form').trigger('submit')

    // Überprüfen, ob fetch mit PUT aufgerufen wurde
    expect(global.fetch).toHaveBeenCalledWith(
      `http://localhost:8080/events/${mockEventToEdit.id}`,
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mockEventToEdit.id, // ID muss im Body enthalten sein für PUT
          title: 'Updated Event Title',
          description: mockEventToEdit.description, // Andere Felder bleiben gleich
          startDateTime: mockEventToEdit.startDateTime,
          endDateTime: mockEventToEdit.endDateTime,
          isCompleted: mockEventToEdit.isCompleted,
        }),
      }),
    )

    await nextTick() // Warten auf DOM-Update nach erfolgreicher Übermittlung
    expect(wrapper.emitted('eventSubmitted')).toBeTruthy()
    expect(wrapper.find('.success-message').text()).toContain('Event successfully updated!')

    vi.runAllTimers() // Fortschreiten der setTimeout-Uhrzeit
    await nextTick()
    expect(wrapper.find('.success-message').exists()).toBe(false)
  })

  it('emits cancelEdit when cancel button is clicked', async () => {
    const wrapper = mount(EventForm, { props: { eventId: mockEventToEdit.id } })
    await nextTick() // initialer fetchEventById
    await nextTick() // DOM Update nach fetch

    await wrapper.find('.cancel-button').trigger('click')

    expect(wrapper.emitted('cancelEdit')).toBeTruthy()
  })

  it('handles API errors during submission', async () => {
    // Mock fetch to simulate an API error on POST
    global.fetch = vi.fn((url, options?) => {
      if (url === 'http://localhost:8080/events' && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Validation error: Title is mandatory'),
        }) as Promise<Response>
      }
      return Promise.reject(new Error('Unhandled fetch request'))
    })

    const wrapper = mount(EventForm, { props: { eventId: null } })

    // Valid data except for what might cause a 400 (e.g., empty title if required)
    await wrapper.find('#title').setValue('') // Simulate invalid input to trigger backend error
    await wrapper.find('#description').setValue('Some description')
    await wrapper.find('#startDateTime').setValue('2025-07-06T10:00')
    await wrapper.find('#endDateTime').setValue('2025-07-06T11:00')

    await wrapper.find('form').trigger('submit')

    await nextTick() // Warten auf DOM-Update nach Fehler
    expect(wrapper.find('.error-message').text()).toContain(
      'Error: 400 - Validation error: Title is mandatory',
    )
    expect(wrapper.emitted('eventSubmitted')).toBeFalsy() // Kein EventSubmitted bei Fehler
    vi.runAllTimers()
    await nextTick()
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })

  it('resets form and loads new event on resetAndLoad(id)', async () => {
    const wrapper = mount(EventForm, { props: { eventId: null } })
    await nextTick()

    // Setze initial Werte
    await wrapper.find('#title').setValue('Temporary Title')
    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe('Temporary Title')

    // Rufe die exponierte Methode resetAndLoad mit einer Event-ID auf
    ;(wrapper.vm as any).resetAndLoad(mockEventToEdit.id) // Type casting, da defineExpose erst zur Laufzeit verfügbar ist

    await nextTick() // Warten auf Watcher-Reaktion und fetch
    await nextTick() // Warten auf DOM-Update nach fetch

    expect(global.fetch).toHaveBeenCalledWith(`http://localhost:8080/events/${mockEventToEdit.id}`)
    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe(mockEventToEdit.title)
    expect(wrapper.find('h2').text()).toBe('Edit Event')
  })

  it('resets form to empty on resetAndLoad(null)', async () => {
    // Zuerst eine Komponente mit einem EventId mounten, um Daten zu laden
    const wrapper = mount(EventForm, { props: { eventId: mockEventToEdit.id } })
    await nextTick() // Trigger initial load
    await nextTick() // Wait for data to be populated

    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe(mockEventToEdit.title)

    // Rufe die exponierte Methode resetAndLoad mit null auf
    ;(wrapper.vm as any).resetAndLoad(null)

    await nextTick() // Wait for form to reset

    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('h2').text()).toBe('Add New Event')
    expect(wrapper.find('.cancel-button').exists()).toBe(false)
  })
})
