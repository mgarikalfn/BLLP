# Topic Test API Flow - Complete Documentation

## Overview

This document explains how topic test questions are fetched from the backend, how they're sent to the frontend, and the complete data flow.

---

## API Endpoints

### 1. Fetch Topic Test Questions

**Endpoint:** `GET /topics/:topicId/test`

**Route File:** `src/modules/content/topic.routes.ts`
```typescript
router.get("/:topicId/test", authenticate, getTopicTest);
```

**Controller:** `src/modules/content/topic.controller.ts`

---

## Backend Flow: How Questions Are Sent

### Controller: `getTopicTest`

**File:** `src/modules/content/topic.controller.ts` (lines 179-211)

```typescript
export const getTopicTest = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract and validate topicId
    const topicId = Array.isArray(req.params.topicId)
      ? req.params.topicId[0]
      : req.params.topicId;
    
    // Step 2: Get sample size (default 10, can be customized)
    const requestedSize = Number(req.query.size);
    const sampleSize = Number.isInteger(requestedSize) && requestedSize > 0 
      ? requestedSize 
      : 10;

    // Step 3: Validate topicId format
    if (!topicId || !Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    // Step 4: Query questions from database
    const testQuestions = await Question.aggregate([
      {
        $match: {
          topicId: new Types.ObjectId(topicId),
          intendedFor: { $in: ["TEST", "BOTH"] },  // Only TEST or BOTH questions
        },
      },
      { $sample: { size: sampleSize } },  // Random sample
    ]);

    // Step 5: Send response
    return res.status(200).json({
      topicId,
      count: testQuestions.length,
      questions: testQuestions,
    });
  } catch (error) {
    console.error("Error generating topic test:", error);
    return res.status(500).json({ message: "Error generating topic test" });
  }
};
```

### Response Format

**HTTP Status:** 200 OK

**Response Body:**
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "count": 10,
  "questions": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "topicId": "507f1f77bcf86cd799439011",
      "type": "MATCHING",
      "intendedFor": "TEST",
      "content": {
        "prompt": { "am": "...", "ao": "..." },
        "pairs": [...]
      },
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "topicId": "507f1f77bcf86cd799439011",
      "type": "CLOZE",
      "intendedFor": "TEST",
      "content": {
        "textWithBlank": { "am": "_______ ነኝ።", "ao": "_______ dha." },
        "options": [
          { "am": "ደህና", "ao": "Nagaa" },
          { "am": "ሰላም", "ao": "Nagaa" }
        ],
        "correctIndex": 0
      },
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Key Points

1. **Question Selection:**
   - Filters by `topicId`
   - Only includes questions where `intendedFor` is "TEST" or "BOTH"
   - Uses MongoDB `$sample` for random selection
   - Default sample size: 10 questions

2. **Question Types:**
   - MATCHING: Pair matching questions
   - CLOZE: Fill-in-the-blank questions

3. **Response Structure:**
   - `topicId`: The topic being tested
   - `count`: Number of questions returned
   - `questions`: Array of question objects

---

## Frontend Flow: How Questions Are Received

### Step 1: Frontend API Call

**File:** `BLLP-frontend/api/topicTest.api.ts`

```typescript
export const getTopicTest = async (topicId: string, size?: number): Promise<TopicTestResponse> => {
  const endpoints = [`/topics/${topicId}/test`, `/api/topics/${topicId}/test`];

  for (const endpoint of endpoints) {
    try {
      const res = await api.get<TopicTestPayload>(endpoint, {
        params: size ? { size } : undefined,
      });

      return normalizeTopicTestPayload(res.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;  // Try next endpoint
      }

      throw error;
    }
  }

  throw new Error("Failed to fetch topic test");
};
```

**Key Features:**
- Tries two endpoints (with and without `/api` prefix)
- Supports custom sample size via query parameter
- Normalizes response format
- Handles 404 errors gracefully

### Step 2: Response Normalization

```typescript
const normalizeTopicTestPayload = (payload: TopicTestPayload): TopicTestResponse => {
  if ("success" in payload) {
    if (!payload.success) {
      throw new Error(payload.message || "Failed to fetch topic test");
    }

    return payload.data;
  }

  return payload;
};
```

**Purpose:**
- Handles both wrapped and unwrapped responses
- Extracts data from ApiResponse wrapper if present
- Throws error if response indicates failure

### Step 3: React Hook

**File:** `BLLP-frontend/hooks/useTopicTest.ts`

```typescript
export const useTopicTest = (topicId: string, size?: number) => {
  return useQuery<TopicTestResponse, Error>({
    queryKey: ["topicTest", topicId, size],
    queryFn: () => getTopicTest(topicId, size),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    enabled: !!topicId,
  });
};
```

**Features:**
- Uses React Query for caching
- Caches for 5 minutes
- Only fetches if topicId is provided
- Provides loading, error, and data states

### Step 4: Component Usage

**File:** `BLLP-frontend/app/(app)/test/[topicId]/page.tsx`

```typescript
export default function TopicTestPage() {
  const params = useParams<{ topicId: string }>();
  const topicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;

  // Fetch questions
  const { data, isLoading, error } = useTopicTest(topicId || "");

  // Extract questions
  const questions = useMemo(() => data?.questions || [], [data?.questions]);

  // Render based on state
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorScreen />;
  if (!questions.length) return <NoQuestionsScreen />;

  // Render questions
  return (
    <div>
      {questions.map((question) => (
        question.type === "MATCHING" ? (
          <MatchingQuestion key={question._id} question={question} />
        ) : (
          <ClozeQuestion key={question._id} question={question} />
        )
      ))}
    </div>
  );
}
```

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TOPIC TEST FLOW                          │
└─────────────────────────────────────────────────────────────┘

FRONTEND
┌──────────────────────────────────────────────────────────┐
│ TopicTestPage Component                                  │
│ ├─ useTopicTest(topicId)                                │
│ └─ useQuery hook                                         │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ topicTest.api.ts                                         │
│ ├─ getTopicTest(topicId, size?)                         │
│ ├─ Tries: /topics/:id/test                              │
│ ├─ Tries: /api/topics/:id/test                          │
│ └─ normalizeTopicTestPayload()                          │
└──────────────────────────────────────────────────────────┘
                         ↓
                    HTTP GET
                         ↓
BACKEND
┌──────────────────────────────────────────────────────────┐
│ topic.routes.ts                                          │
│ router.get("/:topicId/test", authenticate, getTopicTest)│
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ topic.controller.ts                                      │
│ export const getTopicTest = async (req, res) => {       │
│   1. Extract and validate topicId                        │
│   2. Get sample size (default 10)                        │
│   3. Query Question collection:                          │
│      - Match topicId                                     │
│      - Match intendedFor: ["TEST", "BOTH"]              │
│      - Random sample                                     │
│   4. Return TopicTestResponse                            │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ MongoDB Question Collection                              │
│ ├─ Query: { topicId, intendedFor: { $in: [...] } }     │
│ ├─ Sample: { size: 10 }                                 │
│ └─ Return: Array of questions                           │
└──────────────────────────────────────────────────────────┘
                         ↓
                    HTTP 200 OK
                    JSON Response
                         ↓
FRONTEND (Continued)
┌──────────────────────────────────────────────────────────┐
│ Response Received                                        │
│ {                                                        │
│   topicId: "...",                                        │
│   count: 10,                                             │
│   questions: [...]                                       │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ React Query Cache                                        │
│ ├─ Key: ["topicTest", topicId, size]                    │
│ ├─ Data: TopicTestResponse                              │
│ └─ Stale Time: 5 minutes                                │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Component State Update                                   │
│ ├─ data = TopicTestResponse                             │
│ ├─ isLoading = false                                    │
│ └─ error = null                                         │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Render Questions                                         │
│ ├─ For each question in data.questions:                 │
│ │  ├─ IF type === "MATCHING"                            │
│ │  │  └─ Render MatchingQuestion component              │
│ │  └─ IF type === "CLOZE"                               │
│ │     └─ Render ClozeQuestion component                 │
│ └─ Display progress bar                                 │
└──────────────────────────────────────────────────────────┘
```

---

## Question Filtering Logic

### Backend Query

```typescript
const testQuestions = await Question.aggregate([
  {
    $match: {
      topicId: new Types.ObjectId(topicId),
      intendedFor: { $in: ["TEST", "BOTH"] },
    },
  },
  { $sample: { size: sampleSize } },
]);
```

### What Gets Included

✅ Questions where `intendedFor` is:
- "TEST" - Questions created specifically for tests
- "BOTH" - Questions used in both lessons and tests

❌ Questions where `intendedFor` is:
- "LESSON" - Only for lessons
- "TOPIC" - Only for topic reviews

### Sample Size

- **Default:** 10 questions
- **Customizable:** Via `?size=N` query parameter
- **Validation:** Must be positive integer

---

## Response Types

### TypeScript Interfaces

**TopicTestResponse:**
```typescript
export interface TopicTestResponse {
  topicId: string;
  count: number;
  questions: TopicTestQuestion[];
}
```

**TopicTestQuestion:**
```typescript
export interface TopicTestQuestion {
  _id: string;
  topicId: string;
  lessonId?: string;
  intendedFor?: "LESSON" | "TOPIC" | "BOTH" | "TEST";
  type: TopicTestQuestionType;  // "MATCHING" | "CLOZE"
  content: MatchingQuestionContent | TopicTestClozeContent;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}
```

---

## Error Handling

### Backend Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Invalid topic id | topicId not provided or invalid format |
| 500 | Error generating topic test | Database error or server error |

### Frontend Errors

| Error | Cause | Handling |
|-------|-------|----------|
| 404 Not Found | Endpoint doesn't exist | Tries alternative endpoint |
| Network Error | Connection failed | Throws error to component |
| Validation Error | Response format invalid | Throws error to component |

### Component Error States

```typescript
if (isLoading) {
  return <Loader2 className="animate-spin" />;
}

if (error) {
  return (
    <div>
      <h2>Failed to load topic test</h2>
      <p>{error.message}</p>
      <Button onClick={() => router.push(`/topics/${topicId}`)}>
        Back To Topic
      </Button>
    </div>
  );
}

if (!questions.length) {
  return (
    <div>
      <h2>No test questions available yet.</h2>
      <Button onClick={() => router.push(`/topics/${topicId}`)}>
        Back To Topic
      </Button>
    </div>
  );
}
```

---

## Caching Strategy

### React Query Configuration

```typescript
useQuery<TopicTestResponse, Error>({
  queryKey: ["topicTest", topicId, size],
  queryFn: () => getTopicTest(topicId, size),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  enabled: !!topicId,
})
```

### Cache Behavior

1. **First Request:** Fetches from backend
2. **Within 5 minutes:** Returns cached data (fresh)
3. **After 5 minutes:** Data marked as stale
4. **On Stale Data:** Background refetch if component remounts
5. **Manual Refetch:** Can be triggered by user action

### Cache Key

```
["topicTest", topicId, size]
```

- Unique per topic and sample size
- Allows multiple tests to be cached independently

---

## Performance Considerations

### Backend

1. **Random Sampling:** Uses MongoDB `$sample` for efficient random selection
2. **Filtering:** Filters by `topicId` and `intendedFor` before sampling
3. **Indexes:** Should have index on `topicId` and `intendedFor`

### Frontend

1. **Caching:** 5-minute cache reduces unnecessary requests
2. **Lazy Loading:** Only fetches when component mounts
3. **Memoization:** Questions array memoized to prevent re-renders

### Network

1. **Payload Size:** Depends on number of questions and content size
2. **Compression:** HTTP compression reduces payload
3. **Query Parameters:** Optional `size` parameter for customization

---

## Summary

**Topic Test API Flow:**

1. **Frontend** calls `GET /topics/:topicId/test?size=10`
2. **Backend** queries Question collection with filters
3. **Backend** returns random sample of questions
4. **Frontend** normalizes response and caches it
5. **Component** renders questions based on type
6. **User** answers questions
7. **Frontend** calculates score and submits result

**Key Files:**
- Backend: `src/modules/content/topic.controller.ts`
- Frontend API: `BLLP-frontend/api/topicTest.api.ts`
- Frontend Hook: `BLLP-frontend/hooks/useTopicTest.ts`
- Frontend Component: `BLLP-frontend/app/(app)/test/[topicId]/page.tsx`

**Response Format:**
```json
{
  "topicId": "...",
  "count": 10,
  "questions": [
    { "type": "MATCHING", "content": {...} },
    { "type": "CLOZE", "content": {...} }
  ]
}
```
