# System Design: Restaurant Owner AI Agent

## 1. الصورة الكبيرة (High-Level Architecture)

```mermaid
flowchart LR
    subgraph Client["المتصفح (Owner)"]
        UI["AI Assistant Page - React"]
    end

    subgraph NodeAPI["BRP Backend - Node/Express :5000"]
        AUTH["verifyToken + requirePermission ai.use"]
        PROXY["controllerAi - SSE Proxy"]
        LOCAL["buildLocalReply - Fallback"]
    end

    subgraph Agent["AI Agent - Python/FastAPI :8005"]
        API["app.py - POST /chat/stream"]
        LOOP["erp_agent.py - Agent Loop"]
        TOOLS["tools - 8 Analytics Tools"]
        ENGINE["mongo_engine.py - Read-only Queries"]
    end

    LLM["Groq LLM - gpt-oss-120b / llama-3.3-70b"]
    DB[("MongoDB Atlas - BRP Data")]

    UI -->|"1. POST /api/ai/chat + JWT cookie"| AUTH
    AUTH --> PROXY
    PROXY -->|"2. HTTP stream + X-Agent-Secret"| API
    API --> LOOP
    LOOP <-->|"3. tool calling"| LLM
    LOOP --> TOOLS --> ENGINE
    ENGINE -->|"4. aggregate - read only"| DB
    PROXY -.->|"Agent down"| LOCAL
    PROXY -->|"5. SSE stream"| UI
```

| الطبقة | المسؤولية | **لا** تعمل |
|---|---|---|
| **React (AIAssistant.jsx)** | عرض الشات، قراءة الـ stream، عرض Markdown والـ status | مفيهاش أي منطق بيانات |
| **Node (controllerAi.js)** | التحقق من الهوية والصلاحية، تمرير الـ stream، الـ fallback | مابيكلمش الـ LLM |
| **Python Agent** | التفكير، اختيار الأدوات، صياغة الرد والتوصيات | مابيعملش auth للمستخدم ومابيكتبش في الداتابيز |
| **MongoDB** | مصدر الحقيقة الوحيد | — |

---

## 2. رحلة سؤال واحد (Sequence Diagram)

مثال: المالك بيسأل **"إيه أخبار المطعم النهاردة؟"**

```mermaid
sequenceDiagram
    autonumber
    actor Owner as المالك
    participant UI as React - AIAssistant
    participant N as Node - controllerAi
    participant A as Python Agent
    participant L as Groq LLM
    participant M as MongoDB

    Owner->>UI: يكتب السؤال ويضغط Send
    UI->>N: POST /api/ai/chat (message, history) + JWT
    N->>N: verifyToken + check ai.use
    N->>A: POST /chat/stream + X-Agent-Secret
    A->>M: getSettings (اسم المطعم، العملة، التوقيت)
    A->>L: system prompt + سؤال + تعريف 8 tools

    L-->>A: tool_calls: overview, menu_performance, inventory_status
    A-->>N: event status - "جاري تحليل المبيعات..."
    N-->>UI: نفس الـ event
    par تنفيذ الأدوات بالتوازي
        A->>M: aggregate orders + expenses
    and
        A->>M: aggregate orders.items + menuitems
    and
        A->>M: inventories + ingredients + suppliers
    end
    M-->>A: نتائج JSON

    A->>L: نتائج الأدوات (دورة تانية)
    alt الـ LLM محتاج بيانات زيادة
        L-->>A: tool_call تاني (مثلاً get_expenses)
        A->>M: query
        A->>L: النتيجة
    end
    L-->>A: stream الرد النهائي token by token
    loop كل token
        A-->>N: event token
        N-->>UI: event token
        UI-->>Owner: النص بيظهر تدريجياً
    end
    A-->>N: event done
    N-->>UI: event done
```

---

## 3. منطق الـ Agent من جوه (Agent Loop)

```mermaid
stateDiagram-v2
    [*] --> BuildContext: استلام السؤال
    BuildContext --> AskLLM: system prompt + history + tools
    AskLLM --> RunTools: LLM طلب tools
    AskLLM --> StreamAnswer: LLM جاهز يرد
    RunTools --> CheckLimit: تنفيذ بالتوازي وإضافة النتائج
    CheckLimit --> AskLLM: الدورات أقل من 4
    CheckLimit --> StreamAnswer: وصلنا 4 دورات
    AskLLM --> FallbackModel: خطأ أو rate limit
    FallbackModel --> AskLLM: llama-3.3-70b
    FallbackModel --> OfflineReport: كل الموديلات فشلت
    StreamAnswer --> [*]: event done
    OfflineReport --> [*]: تقرير منسق من الأرقام مباشرة
```

**قواعد الـ System Prompt:**
1. أي رقم لازم يكون جاي من tool، ممنوع التأليف.
2. يرد بلغة السؤال (عربي مصري / English).
3. Markdown: جداول + نقاط + أرقام بالعملة.
4. يختم بـ **💡 توصيات للمالك** (2–4 نقاط عملية).
5. التاريخ والوقت الحالي بتوقيت `Africa/Cairo` جوه الـ prompt عشان يفهم "النهاردة" و"الأسبوع اللي فات".

---

## 4. الأدوات ومصادر البيانات (Data Map)

```mermaid
flowchart LR
    T1["get_business_overview"] --> orders & expenses
    T2["get_sales_trend"] --> orders
    T3["get_orders"] --> orders
    T4["get_menu_performance"] --> orders & menuitems & categories
    T5["get_inventory_status"] --> inventories & ingredients & suppliers
    T6["get_expenses"] --> expenses
    T7["get_staff_performance"] --> orders & users
    T8["get_kitchen_and_payments"] --> orders & payments

    orders[("orders")]
    expenses[("expenses")]
    menuitems[("menuitems")]
    categories[("categories")]
    inventories[("inventories")]
    ingredients[("ingredients")]
    suppliers[("suppliers")]
    users[("users - بدون password")]
    payments[("payments")]
```

### العلاقات بين الـ Collections اللي الـ Agent بيقراها

```mermaid
erDiagram
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER_ITEM }o--|| MENU_ITEM : references
    MENU_ITEM }o--|| CATEGORY : belongs_to
    ORDER ||--o{ PAYMENT : paid_by
    ORDER }o--|| USER : created_by
    INVENTORY ||--|| INGREDIENT : balance_of
    INGREDIENT }o--o| SUPPLIER : supplied_by
    EXPENSE }o--|| USER : created_by

    ORDER {
        string orderNumber
        string orderType
        string status
        string paymentStatus
        number total
        date paidAt
        date preparingAt
        date readyAt
        string cancelReason
    }
    ORDER_ITEM {
        string name
        number price
        number cost
        number quantity
    }
    INGREDIENT {
        string name
        string unit
        number costPerUnit
        number minStock
    }
    INVENTORY {
        number quantity
    }
    EXPENSE {
        number amount
        string category
        date date
    }
```

### معادلات الحساب (نفس منطق Dashboard عشان الأرقام تطابق)

| المؤشر | المعادلة |
|---|---|
| Revenue | مجموع `total` للأوردرات `paymentStatus = paid` و `paidAt` جوه الفترة |
| COGS (تكلفة الطعام) | مجموع `items.cost × items.quantity` لنفس الأوردرات |
| Gross Profit | Revenue − COGS |
| Net Profit | Gross Profit − Expenses |
| هامش الصنف | `(price − cost) / price` |
| تكلفة إعادة الشراء | `(minStock − quantity) × costPerUnit` لكل خامة ناقصة |
| وقت التحضير | متوسط `readyAt − preparingAt` |
| مقارنة الفترة | نفس الطول قبل الفترة الحالية مباشرة: `% change` |

---

## 5. تصميم الكود (Python Modules)

```mermaid
classDiagram
    class App {
        +POST /chat/stream
        +GET /health
        -verify_secret(header)
    }
    class ERPAgent {
        -llm: AsyncGroq
        -models: list
        -max_steps: int = 4
        +stream(message, history) AsyncGenerator
        -build_system_prompt(settings)
        -run_tools_parallel(calls)
    }
    class ToolRegistry {
        +schemas: list
        +execute(name, args) dict
    }
    class MongoEngine {
        -db: Database
        -tz: str
        +get_settings()
        +business_overview(from, to)
        +sales_trend(days, group_by)
        +orders(status, type, from, to, limit)
        +menu_performance(days)
        +inventory_status(only_low)
        +expenses(from, to)
        +staff_performance(from, to)
        +kitchen_and_payments(from, to)
        -to_json(doc)
    }
    class SSE {
        +event(type, data) str
        +sse_event_stream(gen)
    }

    App --> ERPAgent
    App --> SSE
    ERPAgent --> ToolRegistry
    ToolRegistry --> MongoEngine
```

---

## 6. شكل الـ Stream بين الطبقات (SSE Contract)

| Event | Data | الواجهة بتعمل إيه |
|---|---|---|
| `status` | `{"text": "جاري فحص المخزون..."}` | تعرض pill صغير متحرك فوق الرد |
| `token` | `{"text": "..."}` | تضيف النص للرسالة الحالية |
| `done` | `{"provider": "groq", "tools": [...]}` | تخفي المؤشر وتفعّل زر Send |
| `error` | `{"message": "..."}` | toast + الرد الاحتياطي |

**مثال على السلك:**
```text
event: status
data: {"text":"جاري تحليل المبيعات والأرباح..."}

event: token
data: {"text":"**ملخص اليوم:** الإيرادات "}

event: done
data: {"provider":"groq","tools":["get_business_overview"]}
```

---

## 7. لو حاجة وقعت (Failure Handling)

```mermaid
flowchart TD
    Q["سؤال المالك"] --> N{"Node: Agent شغال؟"}
    N -->|"لا - timeout 3s"| F1["buildLocalReply من Node - أرقام حقيقية بدون LLM"]
    N -->|"نعم"| G{"Groq: الموديل الأساسي متاح؟"}
    G -->|"نعم"| OK["رد كامل + توصيات"]
    G -->|"لا"| G2{"الموديل البديل llama-3.3؟"}
    G2 -->|"نعم"| OK
    G2 -->|"لا"| F2["Offline Report من Python - جداول منسقة من نتائج الأدوات"]
    DBX{"MongoDB متاح؟"} -->|"لا"| E["رسالة خطأ واضحة: البيانات غير متاحة حالياً"]
```

> [!NOTE]
> في كل الحالات المالك **دايماً** بياخد رد. أسوأ حالة: أرقام حقيقية من غير صياغة ذكية.

---

## 8. الأمان (Security Layers)

```mermaid
flowchart LR
    A["JWT Cookie"] --> B["requirePermission ai.use"]
    B --> C["X-Agent-Secret بين Node و Python"]
    C --> D["Agent على 127.0.0.1 فقط"]
    D --> E["Mongo user بصلاحية read فقط"]
    E --> F["Projection يستبعد password والتوكنات"]
```

| الخطر | الحماية |
|---|---|
| موظف عادي يسأل عن المرتبات والأرباح | `ai.use` للـ Owner/Manager فقط |
| حد يكلم الـ Agent مباشرة | بيسمع على `127.0.0.1` + shared secret |
| Prompt injection يطلب حذف بيانات | مفيش أي tool بتكتب + Mongo user read-only |
| تسريب بيانات حساسة | استبعاد `password`, `passwordChangedAt`, blacklist tokens |
| استهلاك زيادة للـ API | حد 4 دورات للـ tools + `history` آخر 8 رسائل + rate limit على `/api/ai/chat` |

---

## 9. التشغيل (Deployment)

```mermaid
flowchart TB
    subgraph Machine["السيرفر / جهازك"]
        FE["Vite dev :5173"]
        BE["Node backend :5000"]
        AG["Python agent 127.0.0.1:8005"]
    end
    Cloud1[("MongoDB Atlas")]
    Cloud2["Groq API"]
    FE --> BE --> AG
    BE --> Cloud1
    AG --> Cloud1
    AG --> Cloud2
```

**متغيرات البيئة:**

| الملف | المتغير | الوظيفة |
|---|---|---|
| `Backend/.env` | `AGENT_URL=http://127.0.0.1:8005` | عنوان الـ Agent |
| `Backend/.env` | `AGENT_SECRET=...` | السر المشترك |
| `Agent/backend/.env` | `MONGO_URL` (يُفضّل user read-only) | الداتابيز |
| `Agent/backend/.env` | `AGENT_SECRET` | نفس السر |
| `Agent/backend/.env` | `GROQ_API_KEY` | موجود بالفعل |

---

## 10. هيكل الملفات النهائي

```text
Agent/
├── requirements.txt          (+ pymongo[srv], dnspython)
└── backend/
    ├── .env
    ├── app.py                FastAPI: /chat/stream, /health
    ├── erp_agent.py          Agent loop + system prompt
    ├── tools.py              [NEW] 8 tool schemas + registry
    ├── mongo_engine.py       [NEW] read-only aggregations
    └── stream_utils.py       SSE helpers
    (حذف: erp_engine.py, restaurant_erp.db, frontend/)

BRP-System/
├── Backend/src/controllers/controllerAi.js   SSE proxy + fallback
└── frontend/src/Pages/AIAssistant.jsx        streaming + markdown + status
```
