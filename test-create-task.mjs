import fetch from 'node-fetch';

const payload = {
  taskName: 'Debug Task',
  eventDate: '2026-08-15',
  eventLocation: 'London',
  eventOneLiner: 'Community meetup'
};

const res = await fetch('http://localhost:3000/api/create-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

console.log('status', res.status);
console.log(await res.text());
