const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_ID = import.meta.env.VITE_CALENDAR_ID;

let tokenClient;
let accessToken;

/* ---------- Init Google OAuth Client ---------- */
window.onload = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
};

/* ---------- OAuth ---------- */
function requestAccessToken() {
    return new Promise((resolve, reject) => {
        tokenClient.callback = (tokenResponse) => {
            if (tokenResponse.error) {
                reject(tokenResponse);
            } else {
                accessToken = tokenResponse.access_token;
                resolve(accessToken);
            }
        };
        tokenClient.requestAccessToken();
    });
}

function getNextDate(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

  export async function findEvent(summary, date) {
    if (!accessToken) await requestAccessToken();

    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${getNextDate(date)}T00:00:00Z`;

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      q: summary,
      singleEvents: 'true',
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error('Failed to fetch events: ' + res.status);
    const data = await res.json();

    return data.items.filter(event => event.summary === summary);
  }

 export async function addEventToCalendar(summary, date) {
    if (!accessToken) await requestAccessToken();

    const event = {
      summary,
      start: { date },
      end: { date: getNextDate(date) },
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) throw new Error('Failed to add event: ' + res.status);
    return await res.json();
  }

 export async function addEventIfNotExists(summary, date) {
     if (!accessToken) await requestAccessToken();

     try {
      const events = await findEvent(summary, date);
      if (events.length > 0) return 'אירוע קיים';
      await addEventToCalendar(summary, date);
      return 'נוסף בהצלחה!';
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

 export async function deleteEventIfExists(eventName, eventType, isoDate) {
    if (!accessToken) await requestAccessToken();

    const eventsToDelete = await findEvent(eventName, isoDate);
    if (eventsToDelete.length === 0) return 'אירוע לא קיים';

    const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventsToDelete[0].id}`;
    const deleteRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (deleteRes.status === 204) return 'נמחק בהצלחה';
    else alert('שגיאה במחיקת האירוע');
  }
