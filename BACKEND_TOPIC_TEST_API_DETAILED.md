# Backend Topic Test API - Detailed Documentation

## API Endpoint

```
GET /topics/:topicId/test?size=10
```

**Authentication:** Required (JWT token via middleware)

**Route Definition:** `src/modules/content/topic.routes.ts`
```typescript
router.get("/:topicId/test", authenticate, getTopicTest);
```

---

## Controller Function

**File:** `src/modules/content/topic.controller.ts`

**Function Name:** `getTopicTest`

**Lines:** 179-211

### Complete Source Code

```typescript
export const getTopicTest = async (req: Request, res: Response) => {
  try {
    // Step 1: Extract topicId from URL parameters
    const topicId = Array.isArray(req.params.topicId)
      ? req.params.topicId[0]
      : req.params.topicId;
    
    // Step 2: Get sample size from query parameter
    const requestedSize = Number(req.query.size);
    const sampleSize = Number.isInteger(requestedSize) && requestedSize > 0 
      ? requestedSize 
      : 10;

    // Step 3: Validate topicId format
    if (!topicId || !Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    // Step 4: Query MongoDB for test questions
    const testQuestions = await Question.aggregate([
      {
        $match: {
          topicId: new Types.ObjectId(topicId),
          intendedFor: { $in: ["TEST", "BOTH"] },
        },
      },
      { $sample: { size: sampleSize } },
    ]);

    // Step 5: Return response
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

---

## Step-by-Step Breakdown

### Step 1: Extract Topic ID

```typescript
const topicId = Array.isArray(req.params.topicId)
  ? req.params.topicId[0]
  : req.params.topicId;
```

**Purpose:** Handle both array and string parameter formats

**Example:**
- URL: `/topics/507f1f77bcf86cd799439011/test`
- Result: `topicId = "507f1f77bcf86cd799439011"`

### Step 2: Get Sample Size

```typescript
const requestedSize = Number(req.query.size);
const sampleSize = Number.isInteger(requestedSize) && requestedSize > 0 
  ? requestedSize 
  : 10;
```

**Purpose:** Allow customizable number of questions

**Examples:**
- `/topics/:id/test` → `sampleSize = 10` (default)
- `/topics/:id/test?size=5` → `sampleSize = 5`
- `/topics/:id/test?size=20` → `sampleSize = 20`
- `/topics/:id/test?size=-5` → `sampleSize = 10` (invalid, use default)
- `/topics/:id/test?size=abc` → `sampleSize = 10` (invalid, use default)

### Step 3: Validate Topic ID

```typescript
if (!topicId || !Types.ObjectId.isValid(topicId)) {
  return res.status(400).json({ message: "Invalid topic id" });
}
```

**Purpose:** Ensure topicId is a valid MongoDB ObjectId

**Valid Format:** 24-character hexadecimal string
- Example: `507f1f77bcf86cd799439011`

**Invalid Formats:**
- Empty string: ``
- Too short: `507f1f77`
- Invalid characters: `507f1f77bcf86cd799439zzz`

### Step 4: Query MongoDB

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

**MongoDB Aggregation Pipeline:**

1. **$match Stage:** Filter questions
   - `topicId`: Must match the requested topic
   - `intendedFor`: Must be "TEST" or "BOTH"
   
2. **$sample Stage:** Random selection
   - Randomly selects `sampleSize` documents
   - Efficient for large collections

**Question Filtering Logic:**

```
All Questions in Collection
│
├─ Question 1: topicId=X, intendedFor="LESSON"     ❌ EXCLUDED
├─ Question 2: topicId=X, intendedFor="TEST"       ✅ INCLUDED
├─ Question 3: topicId=X, intendedFor="BOTH"       ✅ INCLUDED
├─ Question 4: topicId=X, intendedFor="TOPIC"      ❌ EXCLUDED
├─ Question 5: topicId=Y, intendedFor="TEST"       ❌ EXCLUDED (wrong topic)
├─ Question 6: topicId=X, intendedFor="TEST"       ✅ INCLUDED
├─ Question 7: topicId=X, intendedFor="BOTH"       ✅ INCLUDED
└─ ...

After $match:
├─ Question 2 ✅
├─ Question 3 ✅
├─ Question 6 ✅
├─ Question 7 ✅
└─ ...

After $sample (size: 10):
├─ Question 7 (Random 1)
├─ Question 2 (Random 2)
├─ Question 3 (Random 3)
├─ Question 6 (Random 4)
└─ ... (up to 10)
```

### Step 5: Return Response

```typescript
return res.status(200).json({
  topicId,
  count: testQuestions.length,
  questions: testQuestions,
});
```

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
        "prompt": {
          "am": "ቃላቶቹን ያዛምዱ",
          "ao": "Jechootaa walqabsiisuu"
        },
        "pairs": [
          { "left": "ደህና", "right": "Nagaa" },
          { "left": "ሰላም", "right": "Salaam" }
        ]
      },
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "topicId": "507f1f77bcf86cd799439011",
      "type": "CLOZE",
      "intendedFor": "BOTH",
      "content": {
        "textWithBlank": {
          "am": "_______ ነኝ።",
          "ao": "_______ dha."
        },
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

---

## Error Handling

### Error Case 1: Invalid Topic ID

**Request:**
```
GET /topics/invalid-id/test
```

**Response:**
```json
{
  "status": 400,
  "body": {
    "message": "Invalid topic id"
  }
}
```

### Error Case 2: Server Error

**Request:**
```
GET /topics/507f1f77bcf86cd799439011/test
```

**Response (if database error):**
```json
{
  "status": 500,
  "body": {
    "message": "Error generating topic test"
  }
}
```

---

## Question Model Structure

**File:** `src/modules/content/question.model.ts`

**Fields Used in Query:**
```typescript
interface Question {
  _id: ObjectId;
  topicId: ObjectId;           // Filtered by this
  type: "MATCHING" | "CLOZE";
  intendedFor: "LESSON" | "TOPIC" | "BOTH" | "TEST";  // Filtered by this
  content: {
    // For MATCHING:
    prompt?: LocalizedString;
    pairs?: Array<{ left: string; right: string }>;
    
    // For CLOZE:
    textWithBlank?: LocalizedString;
    options?: Array<LocalizedString>;
    correctIndex?: number;
  };
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Database Indexes

**Recommended Indexes for Performance:**

```typescript
// Index on topicId for faster filtering
db.questions.createIndex({ topicId: 1 });

// Compound index for filtering
db.questions.createIndex({ topicId: 1, intendedFor: 1 });

// Index on intendedFor for filtering
db.questions.createIndex({ intendedFor: 1 });
```

**Why These Indexes:**
- `topicId`: Most common filter
- `topicId + intendedFor`: Compound filter used in query
- `intendedFor`: Secondary filter

---

## Request/Response Examples

### Example 1: Basic Request

**Request:**
```
GET /topics/507f1f77bcf86cd799439011/test
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "count": 10,
  "questions": [...]
}
```

### Example 2: Custom Sample Size

**Request:**
```
GET /topics/507f1f77bcf86cd799439011/test?size=5
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "count": 5,
  "questions": [...]
}
```

### Example 3: Large Sample Size

**Request:**
```
GET /topics/507f1f77bcf86cd799439011/test?size=50
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "count": 50,
  "questions": [...]
}
```

---

## Performance Characteristics

### Time Complexity

- **Validation:** O(1)
- **MongoDB $match:** O(n) where n = total questions in collection
- **MongoDB $sample:** O(k) where k = sample size
- **Overall:** O(n) - linear scan of collection

### Space Complexity

- **Response:** O(k) where k = sample size
- **Memory:** O(k) for storing questions in memory

### Query Optimization

**Current Query:**
```typescript
Question.aggregate([
  { $match: { topicId: ObjectId, intendedFor: { $in: [...] } } },
  { $sample: { size: 10 } }
])
```

**Optimization Tips:**
1. Add index on `topicId` and `intendedFor`
2. Consider caching frequently accessed tests
3. Limit maximum sample size to prevent large responses

---

## Integration with Frontend

### Frontend Hook

```typescript
export const useTopicTest = (topicId: string, size?: number) => {
  return useQuery<TopicTestResponse, Error>({
    queryKey: ["topicTest", topicId, size],
    queryFn: () => getTopicTest(topicId, size),
    staleTime: 5 * 60 * 1000,
    enabled: !!topicId,
  });
};
```

### Frontend API Call

```typescript
export const getTopicTest = async (topicId: string, size?: number) => {
  const res = await api.get(`/topics/${topicId}/test`, {
    params: size ? { size } : undefined,
  });
  return res.data;
};
```

### Component Usage

```typescript
const { data, isLoading, error } = useTopicTest(topicId);

if (isLoading) return <Spinner />;
if (error) return <Error />;

const questions = data?.questions || [];
```

---

## Summary

**Backend API Endpoint:** `GET /topics/:topicId/test?size=10`

**Controller Function:** `getTopicTest(req, res)`

**What It Does:**
1. Validates topic ID format
2. Gets sample size (default 10)
3. Queries MongoDB for questions matching:
   - Topic ID
   - intendedFor: "TEST" or "BOTH"
4. Returns random sample of questions

**Response Format:**
```json
{
  "topicId": "...",
  "count": 10,
  "questions": [...]
}
```

**Key Features:**
- Random question sampling
- Customizable sample size
- Bilingual question support
- Multiple question types (MATCHING, CLOZE)
- Error handling
- Authentication required

**Files:**
- Controller: `src/modules/content/topic.controller.ts`
- Routes: `src/modules/content/topic.routes.ts`
- Model: `src/modules/content/question.model.ts`
