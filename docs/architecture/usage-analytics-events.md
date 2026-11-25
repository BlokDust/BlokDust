# Usage analytics events

How each usage event (SPEC-SHARING-USAGE-ANALYTICS, SHARING-0010) is stored in Workers Analytics Engine. The event
list itself is `server/src/events.ts`; this page was the head of that file (CHG-0045).

```
Usage analytics event list (SPEC-SHARING-USAGE-ANALYTICS R2, SHARING-0010). Shared by the Worker (which accepts only
these) and the web client (which only sends these). Pure TypeScript: no Worker or DOM types.

Every event is written to Workers Analytics Engine as one data point:
  index1  event name
  blob1   event        blob2 surface   blob3 app version   blob4 os   blob5 browser   blob6 country   blob7 visitor
  blob8…  the event's string properties, in the order listed below (up to 5)
  double1 weight (1 / sample rate: one sent event stands for this many)   double2…  numeric properties, in order (up to 5)
```
