import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://platform.foodhelpline.org";

// Generator that pages through ALL resources automatically
async function* fetchAllResources() {
    let cursor: string | undefined;
    let page = 0;

    do {
        const params = new URLSearchParams({ take: "100" });
        if (cursor) params.set("cursor", cursor);

        const raw = await fetch(`${BASE_URL}/api/resources?${params}`);
        const json = await raw.json();

        // The API wraps everything in a "json" key (superjson format)
        const data = json.json as {
            resources: any[];
            cursor?: string;
            count: number;
        };

        console.log(`Page ${++page}: got ${data.resources.length} (total in API: ${data.count})`);

        yield* data.resources;  // "yield*" hands each resource one at a time to the for loop below
        cursor = data.cursor;   // undefined when there are no more pages
    } while (cursor);
}

export async function POST() {
    let synced = 0;
    let skipped = 0;

    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Get all IDs we already have that were synced recently
        const recentIds = new Set(
            (await prisma.resource.findMany({
                where: { syncedAt: { gte: oneDayAgo } },
                select: { id: true },
            })).map((r: { id: string }) => r.id)
        );

        for await (const r of fetchAllResources()) {
            if (recentIds.has(r.id)) continue;  // already fresh, skip it

            // Skip merged duplicates
            if (r.mergedToResourceId) {
                skipped++;
                continue;
            }

            // upsert = insert if new, update if already exists (safe to re-run)
            await prisma.resource.upsert({
                where: { id: r.id },
                create: {
                    id: r.id,
                    name: r.name ?? null,
                    description: r.description ?? null,
                    description_es: r.description_es ?? null,
                    addressStreet1: r.addressStreet1 ?? null,
                    addressStreet2: r.addressStreet2 ?? null,
                    city: r.city ?? null,
                    state: r.state ?? null,
                    zipCode: r.zipCode ?? null,
                    latitude: r.latitude ?? null,
                    longitude: r.longitude ?? null,
                    timezone: r.timezone ?? null,
                    website: r.website ?? null,
                    resourceTypeId: r.resourceType?.id ?? null,
                    resourceTypeName: r.resourceType?.name ?? null,
                    resourceStatusId: r.resourceStatus?.id ?? null,
                    openByAppointment: r.openByAppointment ?? false,
                    appointmentRequired: r.appointmentRequired ?? false,
                    acceptingNewClients: r.acceptingNewClients ?? true,
                    confidence: r.confidence ?? null,
                    ratingAverage: r.ratingAverage ?? null,
                    waitTimeMinutesAverage: r.waitTimeMinutesAverage ?? null,
                    reviewCount: r._count?.reviews ?? 0,
                    subscriberCount: r._count?.resourceSubscriptions ?? 0,
                    priority: r.priority ?? null,
                    contacts: r.contacts ?? [],
                    images: r.images ?? [],
                    shifts: r.shifts ?? [],
                    occurrences: r.occurrences ?? [],
                    occurrenceSkipRanges: r.occurrenceSkipRanges ?? [],
                    tags: r.tags ?? [],
                    regionsServed: r.regionsServed ?? [],
                    resourceSlugs: r.resourceSlugs ?? [],
                    syncedAt: new Date(),
                },
                update: {
                    // Only refresh fields likely to change over time
                    name: r.name ?? null,
                    description: r.description ?? null,
                    resourceStatusId: r.resourceStatus?.id ?? null,
                    ratingAverage: r.ratingAverage ?? null,
                    confidence: r.confidence ?? null,
                    occurrences: r.occurrences ?? [],
                    shifts: r.shifts ?? [],
                    reviewCount: r._count?.reviews ?? 0,
                    subscriberCount: r._count?.resourceSubscriptions ?? 0,
                    syncedAt: new Date(),
                },
            });

            synced++;
        }

        return NextResponse.json({ success: true, synced, skipped });
    } catch (err) {
        console.error("Sync failed:", err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}