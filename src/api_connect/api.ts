export async function createTrip(tripData: any) {
  const res = await fetch("/api/createTrip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tripData),
  });
  return await res.json();
}
