# Categories CRUD API Documentation

## Base URL
`http://localhost:3000/api/categories`

## Category Model
```typescript
interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  createdAt: string;
  updatedAt: string;
}
```

## Endpoints

### 1. Get All Categories
- **GET** `/api/categories`
- **Response**: 
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Salary",
      "type": "INCOME",
      "createdAt": "2026-02-25T09:47:18.850Z",
      "updatedAt": "2026-02-25T09:47:18.850Z"
    }
  ]
}
```

### 2. Get Category by ID
- **GET** `/api/categories/{id}`
- **Response**: 
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Salary",
    "type": "INCOME",
    "createdAt": "2026-02-25T09:47:18.850Z",
    "updatedAt": "2026-02-25T09:47:18.850Z"
  }
}
```

### 3. Create Category
- **POST** `/api/categories`
- **Request Body**:
```json
{
  "name": "Transportation",
  "type": "EXPENSE"
}
```
- **Response**: 
```json
{
  "success": true,
  "data": {
    "id": "1772012858313",
    "name": "Transportation",
    "type": "EXPENSE",
    "createdAt": "2026-02-25T09:47:38.313Z",
    "updatedAt": "2026-02-25T09:47:38.313Z"
  }
}
```

### 4. Update Category
- **PUT** `/api/categories/{id}`
- **Request Body** (all fields optional):
```json
{
  "name": "Groceries",
  "type": "EXPENSE"
}
```
- **Response**: 
```json
{
  "success": true,
  "data": {
    "id": "2",
    "name": "Groceries",
    "type": "EXPENSE",
    "createdAt": "2026-02-25T09:47:18.850Z",
    "updatedAt": "2026-02-25T09:47:55.642Z"
  }
}
```

### 5. Delete Category
- **DELETE** `/api/categories/{id}`
- **Response**: 
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Name and type are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Category not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create category"
}
```

## Testing Examples

### Create an INCOME category:
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Freelance Work", "type": "INCOME"}'
```

### Create an EXPENSE category:
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Rent", "type": "EXPENSE"}'
```

### Update a category:
```bash
curl -X PUT http://localhost:3000/api/categories/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Monthly Salary"}'
```

### Get all categories:
```bash
curl http://localhost:3000/api/categories
```

### Delete a category:
```bash
curl -X DELETE http://localhost:3000/api/categories/1
```

## Validation Rules
- `name`: Required, string
- `type`: Required, must be either "INCOME" or "EXPENSE"
- Category names can be updated
- Category types can be changed between INCOME and EXPENSE
