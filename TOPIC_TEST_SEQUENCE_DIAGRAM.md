# Topic Test - Sequence Diagram & Architecture

## Complete Sequence Diagram

```
┌─────────────┐                    ┌──────────────┐                ┌──────────────┐
│   Browser   │                    │   Frontend   │                │   Backend    │
│  (User)     │                    │   (Next.js)  │                │  (Express)   │
└──────┬──────┘                    └──────┬───────┘                └──────┬───────┘
       │                                  │                               │
       │ 1. Click "Take Test"             │                               │
       ├─────────────────────────────────>│                               │
       │                                  │                               │
       │                                  │ 2. useTopicTest(topicId)      │
       │                                  ├──────────────────────────────>│
       │                                  │                               │
       │                                  │ 3. GET /topics/:id/test       │
       │                                  ├──────────────────────────────>│
       │                                  │                               │
       │                                  │                    4. Query MongoDB
       │                                  │                    - Match topicId
       │                                  │                    - Match intendedFor
       │                                  │                    - Random sample
       │                                  │                               │
       │                                  │ 5. TopicTestResponse          │
       │                                  │<──────────────────────────────┤
       │                                  │                               │
       │                                  │ 6. Cache in React Query       │
       │                                  │    (5 min TTL)                │
       │                                  │                               │
       │ 7. Render Questions              │                               │
       │<─────────────────────────────────┤                               │
       │                                  │                               │
       │ 8. Answer Question 1             │                               │
       ├─────────────────────────────────>│                               │
       │                                  │ (Local state update)          │
       │                                  │                               │
       │ 9. Answer Question 2             │                               │
       ├─────────────────────────────────>│                               │
       │                                  │                               │
       │ 10. Answer Question 3            │                               │
       ├─────────────────────────────────>│                               │
       │                                  │                               │
       │ ... (repeat for all questions)   │                               │
       │                                  │                               │
       │ 11. Submit Test                  │                               │
       ├─────────────────────────────────>│                               │
       │                                  │ 12. Calculate Score           │
       │                                  │     (correct / total * 100)   │
       │                                  │                               │
       │                                  │ 13. POST /study/progress/     │
       │                                  │     topic-test                │
       │                                  ├──────────────────────────────>│
       │                                  │                               │
       │                                  │                    14. Update Progress
       │                                  │                    - Mark completed
       │                                  │                    - Save score
       │                                  │                    - Check level up
       │                                  │                               │
       │                                  │ 15. Response                  │
       │                                  │<──────────────────────────────┤
       │                                  │                               │
       │ 16. Show Result Screen           │                               │
       │<─────────────────────────────────┤                               │
       │                                  │                               │
       │ 17. Navigate to Next Topic       │                               │
       ├─────────────────────────────────>│                               │
       │                                  │                               │
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TopicTestPage                              │
│  (app/(app)/test/[topicId]/page.tsx)                            │
│                                                                 │
│  ├─ useTopicTest(topicId)                                       │
│  │  └─ useQuery hook                                            │
│  │     └─ getTopicTest(topicId)                                 │
│  │        └─ api.get("/topics/:id/test")                        │
│  │                                                              │
│  ├─ State Management                                            │
│  │  ├─ currentIndex: number                                     │
│  │  ├─ answers: boolean[]                                       │
│  │  ├─ currentAnswered: boolean | null                          │
│  │  ├─ finished: boolean                                        │
│  │  └─ levelUp: { newLevel: string } | null                     │
│  │                                                              │
│  ├─ Conditional Rendering                                       │
│  │  ├─ IF isLoading → <LoadingSpinner />                        │
│  │  ├─ IF error → <ErrorScreen />                               │
│  │  ├─ IF !questions.length → <NoQuestionsScreen />             │
│  │  ├─ IF finished → <ResultScreen />                           │
│  │  ├─ IF levelUp → <LevelUpCelebration />                      │
│  │  └─ ELSE → <QuestionRenderer />                              │
│  │                                                              │
│  └─ Question Rendering                                          │
│     ├─ IF question.type === "MATCHING"                          │
│     │  └─ <MatchingQuestion />                                  │
│     │     ├─ State: leftSelectedId, rightSelectedId             │
│     │     ├─ State: matchedIds, mistakes                        │
│     │     └─ onAnswered(isCorrect)                              │
│     │                                                           │
│     └─ IF question.type === "CLOZE"                             │
│        └─ <ClozeQuestion />                                     │
│           ├─ State: selectedIndex                               │
│           └─ onAnswered(isCorrect)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TopicTestPage                                                   │
│  ├─ useTopicTest(topicId)                                        │
│  │  └─ React Query                                               │
│  │     ├─ queryKey: ["topicTest", topicId, size]                │
│  │     ├─ staleTime: 5 * 60 * 1000                               │
│  │     └─ enabled: !!topicId                                     │
│  │                                                               │
│  └─ getTopicTest(topicId, size?)                                 │
│     ├─ Try: GET /topics/:id/test                                 │
│     ├─ Fallback: GET /api/topics/:id/test                        │
│     └─ normalizeTopicTestPayload()                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                         HTTP Request
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  topic.routes.ts                                                 │
│  └─ router.get("/:topicId/test", authenticate, getTopicTest)    │
│                                                                  │
│  topic.controller.ts                                             │
│  └─ getTopicTest(req, res)                                       │
│     ├─ Extract topicId from params                               │
│     ├─ Get sample size from query (default: 10)                  │
│     ├─ Validate topicId format                                   │
│     │                                                            │
│     └─ Question.aggregate([                                      │
│        ├─ $match: {                                              │
│        │  ├─ topicId: ObjectId(topicId)                          │
│        │  └─ intendedFor: { $in: ["TEST", "BOTH"] }             │
│        │ }                                                       │
│        └─ $sample: { size: sampleSize }                          │
│        ])                                                        │
│                                                                  │
│  MongoDB                                                         │
│  └─ Question Collection                                          │
│     ├─ Index on topicId                                          │
│     ├─ Index on intendedFor                                      │
│     └─ Random sample of matching documents                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                         HTTP Response
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    RESPONSE FORMAT                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  {                                                               │
│    "topicId": "507f1f77bcf86cd799439011",                        │
│    "count": 10,                                                  │
│    "questions": [                                                │
│      {                                                           │
│        "_id": "507f1f77bcf86cd799439012",                        │
│        "type": "MATCHING",                                       │
│        "content": {                                              │
│          "prompt": { "am": "...", "ao": "..." },                 │
│          "pairs": [...]                                          │
│        }                                                         │
│      },                                                          │
│      {                                                           │
│        "_id": "507f1f77bcf86cd799439013",                        │
│        "type": "CLOZE",                                          │
│        "content": {                                              │
│          "textWithBlank": { "am": "...", "ao": "..." },          │
│          "options": [...],                                       │
│          "correctIndex": 0                                       │
│        }                                                         │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND PROCESSING                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Normalize Response                                            │
│     └─ Extract data from ApiResponse wrapper if present          │
│                                                                  │
│  2. Cache in React Query                                         │
│     ├─ Key: ["topicTest", topicId, size]                         │
│     ├─ Data: TopicTestResponse                                   │
│     └─ TTL: 5 minutes                                            │
│                                                                  │
│  3. Update Component State                                       │
│     ├─ data = TopicTestResponse                                  │
│     ├─ isLoading = false                                         │
│     └─ error = null                                              │
│                                                                  │
│  4. Render Questions                                             │
│     ├─ For each question in data.questions:                      │
│     │  ├─ IF type === "MATCHING"                                 │
│     │  │  └─ <MatchingQuestion question={q} />                   │
│     │  └─ IF type === "CLOZE"                                    │
│     │     └─ <ClozeQuestion question={q} />                      │
│     └─ Display progress bar                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Question Selection Logic

```
┌─────────────────────────────────────────────────────────────────┐
│              Question Selection Process                         │
└─────────────────────────────────────────────────────────────────┘

MongoDB Question Collection
│
├─ Question 1: intendedFor = "LESSON"     ❌ EXCLUDED
├─ Question 2: intendedFor = "TEST"       ✅ INCLUDED
├─ Question 3: intendedFor = "BOTH"       ✅ INCLUDED
├─ Question 4: intendedFor = "TOPIC"      ❌ EXCLUDED
├─ Question 5: intendedFor = "TEST"       ✅ INCLUDED
├─ Question 6: intendedFor = "BOTH"       ✅ INCLUDED
├─ Question 7: intendedFor = "LESSON"     ❌ EXCLUDED
├─ Question 8: intendedFor = "TEST"       ✅ INCLUDED
├─ Question 9: intendedFor = "BOTH"       ✅ INCLUDED
└─ Question 10: intendedFor = "TEST"      ✅ INCLUDED

Filter: intendedFor: { $in: ["TEST", "BOTH"] }
│
├─ Question 2 ✅
├─ Question 3 ✅
├─ Question 5 ✅
├─ Question 6 ✅
├─ Question 8 ✅
├─ Question 9 ✅
└─ Question 10 ✅

Random Sample: { size: 10 }
│
├─ Question 9 (Random 1)
├─ Question 2 (Random 2)
├─ Question 6 (Random 3)
├─ Question 5 (Random 4)
├─ Question 3 (Random 5)
├─ Question 8 (Random 6)
├─ Question 10 (Random 7)
└─ ... (up to sample size)

Return to Frontend
│
└─ TopicTestResponse with 7 questions
```

---

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Query Cache                            │
└─────────────────────────────────────────────────────────────────┘

First Request (t=0)
│
├─ Cache Miss
├─ Fetch from Backend
├─ Store in Cache
│  ├─ Key: ["topicTest", "507f...", 10]
│  ├─ Data: TopicTestResponse
│  ├─ Status: fresh
│  └─ TTL: 5 minutes
│
└─ Return Data to Component

Second Request (t=1 min)
│
├─ Cache Hit
├─ Data is fresh (< 5 min)
├─ Return cached data immediately
│
└─ No Backend Request

Third Request (t=6 min)
│
├─ Cache Hit
├─ Data is stale (> 5 min)
├─ Return cached data
├─ Background refetch from Backend
│
└─ Update cache when response arrives

Manual Refetch
│
├─ queryClient.invalidateQueries()
├─ Cache cleared
├─ Immediate fetch from Backend
│
└─ Return fresh data
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Error Handling                               │
└─────────────────────────────────────────────────────────────────┘

Frontend Request
│
├─ Try: GET /topics/:id/test
│  │
│  ├─ Success (200) → Return data
│  ├─ 404 Not Found → Try fallback endpoint
│  ├─ 400 Bad Request → Throw error
│  ├─ 500 Server Error → Throw error
│  └─ Network Error → Throw error
│
└─ Try: GET /api/topics/:id/test
   │
   ├─ Success (200) → Return data
   ├─ 404 Not Found → Throw "Failed to fetch topic test"
   ├─ 400 Bad Request → Throw error
   ├─ 500 Server Error → Throw error
   └─ Network Error → Throw error

Component Error Handling
│
├─ IF isLoading → Show spinner
├─ IF error → Show error screen
├─ IF !questions.length → Show "No questions" screen
└─ ELSE → Show questions
```

---

## Summary

**Key Components:**
- `TopicTestPage`: Main container
- `useTopicTest`: React Query hook
- `getTopicTest`: API wrapper
- `MatchingQuestion`: Question component
- `ClozeQuestion`: Question component

**Key Endpoints:**
- `GET /topics/:topicId/test`: Fetch questions
- `POST /study/progress/topic-test`: Submit result

**Key Features:**
- Random question sampling
- 5-minute caching
- Bilingual support
- Multiple question types
- Error handling
- Progress tracking
