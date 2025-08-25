# Going Bananas Personalization API Documentation

## Overview

The Personalization API provides comprehensive user profiling and customization capabilities for the Going Bananas T&C Analyzer. This system enables highly personalized risk assessments, explanation styles, and alert preferences based on detailed user characteristics and preferences.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [Data Schemas](#data-schemas)
4. [Personalization Algorithm](#personalization-algorithm)
5. [Integration Examples](#integration-examples)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)

## Architecture Overview

The personalization system consists of several interconnected components:

### Core Components

- **PersonalizationService**: Core business logic for profile management and computation
- **GeminiPersonalizationService**: AI integration with personalized prompts
- **Personalization Schemas**: Comprehensive validation schemas for user data
- **Personalization Routes**: RESTful API endpoints for profile management

### Data Flow

```
User Quiz Response → Validation → Profile Computation → Storage → AI Integration
                                        ↓
User Preferences ← Threshold Calculation ← Risk Tolerance Analysis
```

### Key Features

- **Comprehensive Profiling**: Demographics, digital behavior, risk preferences, contextual factors
- **Dynamic Computation**: Real-time calculation of risk thresholds and explanation styles
- **AI Personalization**: Custom Gemini prompts based on user characteristics
- **Adaptive Learning**: Profile updates and refinement over time

## API Endpoints

### 1. Submit Complete Personalization Profile

**Endpoint**: `POST /api/personalization/profile`

**Purpose**: Submit complete user personalization quiz response and compute personalized parameters.

**Request Body**:
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "completedAt": "2024-01-15T10:30:00Z",
  "demographics": {
    "ageRange": "26_40",
    "jurisdiction": {
      "primaryCountry": "US",
      "primaryState": "CA",
      "frequentTravel": false,
      "isExpatriate": false
    },
    "occupation": "technology"
  },
  "digitalBehavior": {
    "techSophistication": {
      "readingFrequency": "read_important",
      "comfortLevel": "advanced", 
      "preferredExplanationStyle": "balanced_technical"
    },
    "usagePatterns": {
      "primaryActivities": ["work_productivity", "social_media"],
      "signupFrequency": "monthly",
      "deviceUsage": "mixed_usage"
    }
  },
  "riskPreferences": {
    "privacy": {
      "overallImportance": "very_important",
      "sensitiveDataTypes": [
        {"dataType": "financial_information", "priorityLevel": 1},
        {"dataType": "personal_communications", "priorityLevel": 2}
      ],
      "dataProcessingComfort": {
        "domesticProcessing": "comfortable",
        "internationalTransfers": "cautious",
        "thirdPartySharing": "uncomfortable",
        "aiProcessing": "cautious",
        "longTermStorage": "cautious"
      }
    },
    "financial": {
      "paymentApproach": "cautious",
      "feeImpact": "moderate",
      "financialSituation": "stable_employment",
      "subscriptionTolerance": {
        "autoRenewal": "cautious",
        "freeTrialToSubscription": "cautious",
        "priceChanges": "reasonable_notice"
      }
    },
    "legal": {
      "arbitrationComfort": "prefer_courts",
      "liabilityTolerance": "reasonable_limitations",
      "legalKnowledge": {
        "contractLaw": "basic",
        "privacyLaw": "intermediate",
        "consumerRights": "basic"
      },
      "previousIssues": "minor_problems"
    }
  },
  "contextualFactors": {
    "dependentStatus": "spouse_partner",
    "specialCircumstances": ["handles_sensitive_data"],
    "decisionMakingPriorities": [
      {"factor": "privacy_protection", "priority": 1},
      {"factor": "features_functionality", "priority": 2},
      {"factor": "cost_value", "priority": 3}
    ],
    "alertPreferences": {
      "interruptionTiming": "moderate_and_high",
      "educationalContent": "occasionally_important",
      "alertFrequencyLimit": 10,
      "learningMode": true
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Personalization profile saved successfully",
  "profile": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "computedProfile": {
      "riskTolerance": {
        "privacy": 4.2,
        "financial": 6.1,
        "legal": 5.8,
        "overall": 5.4
      },
      "alertThresholds": {
        "privacy": 5.8,
        "liability": 4.2,
        "termination": 6.0,
        "payment": 3.9,
        "overall": 4.6
      },
      "explanationStyle": "balanced_educational",
      "profileTags": [
        "age_26_40",
        "occupation_technology",
        "jurisdiction_US",
        "tech_advanced",
        "privacy_very_important",
        "usage_work_productivity",
        "usage_social_media",
        "dependents_spouse_partner",
        "special_handles_sensitive_data"
      ],
      "computedAt": "2024-01-15T10:30:15Z",
      "computationVersion": "1.0"
    },
    "lastUpdated": "2024-01-15T10:30:15Z"
  },
  "metadata": {
    "processing_time": 245,
    "profile_version": "1.0",
    "computation_version": "1.0",
    "timestamp": "2024-01-15T10:30:15Z"
  }
}
```

### 2. Update Profile Section

**Endpoint**: `PATCH /api/personalization/profile/{userId}`

**Purpose**: Update specific section of user profile without full re-submission.

**Request Body**:
```json
{
  "section": "riskPreferences",
  "data": {
    "privacy": {
      "overallImportance": "extremely_important"
    }
  },
  "recomputeProfile": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile section updated successfully",
  "profile": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "updatedSection": "riskPreferences",
    "computedProfile": {
      "riskTolerance": {
        "privacy": 3.1,
        "financial": 6.1,
        "legal": 5.8,
        "overall": 5.0
      },
      "alertThresholds": {
        "privacy": 6.9,
        "liability": 4.2,
        "termination": 6.0,
        "payment": 3.9,
        "overall": 5.2
      },
      "explanationStyle": "balanced_educational",
      "profileTags": [
        "privacy_extremely_important"
      ]
    },
    "lastUpdated": "2024-01-15T11:45:22Z"
  },
  "metadata": {
    "processing_time": 123,
    "recomputed": true,
    "timestamp": "2024-01-15T11:45:22Z"
  }
}
```

### 3. Retrieve User Profile

**Endpoint**: `GET /api/personalization/profile/{userId}`

**Purpose**: Get complete user personalization profile with computed parameters.

**Response**:
```json
{
  "success": true,
  "profile": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "version": "1.0",
    "completedAt": "2024-01-15T10:30:00Z",
    "demographics": { /* full demographics object */ },
    "digitalBehavior": { /* full digital behavior object */ },
    "riskPreferences": { /* full risk preferences object */ },
    "contextualFactors": { /* full contextual factors object */ },
    "computedProfile": { /* computed parameters */ },
    "lastUpdated": "2024-01-15T11:45:22Z"
  },
  "metadata": {
    "processing_time": 15,
    "profile_version": "1.0",
    "last_updated": "2024-01-15T11:45:22Z",
    "computation_version": "1.0",
    "timestamp": "2024-01-15T11:45:22Z"
  }
}
```

### 4. Get Personalization Insights

**Endpoint**: `GET /api/personalization/insights/{userId}`

**Purpose**: Get human-readable insights and recommendations about user's profile.

**Response**:
```json
{
  "success": true,
  "insights": {
    "riskProfileSummary": {
      "privacy": { "level": "Low", "score": 3.1 },
      "financial": { "level": "Moderate", "score": 6.1 },
      "legal": { "level": "Moderate", "score": 5.8 },
      "overall": { "level": "Balanced", "score": 5.0 }
    },
    "alertConfiguration": {
      "privacy": "High Sensitivity",
      "liability": "Moderate Sensitivity",
      "termination": "Moderate Sensitivity",
      "payment": "High Sensitivity",
      "overall": "Moderate Sensitivity"
    },
    "explanationStyle": {
      "style": "balanced_educational",
      "description": "Balanced approach with educational content"
    },
    "recommendations": [
      {
        "type": "threshold_adjustment",
        "message": "Your privacy settings are very strict - consider if this matches your actual needs"
      }
    ],
    "profileStrengths": [
      "Strong privacy awareness",
      "Actively reviews terms and conditions"
    ],
    "improvementSuggestions": [
      {
        "area": "education",
        "suggestion": "Learn about basic contract law and consumer rights"
      }
    ]
  },
  "metadata": {
    "processing_time": 67,
    "generated_at": "2024-01-15T12:00:00Z"
  }
}
```

### 5. Get Quiz Schema

**Endpoint**: `GET /api/personalization/quiz/schema`

**Purpose**: Get quiz structure and validation requirements for frontend implementation.

**Response**:
```json
{
  "success": true,
  "schema": {
    "version": "1.0",
    "sections": {
      "demographics": {
        "title": "Demographics & Context",
        "description": "Basic information about you and your legal context",
        "fields": {
          "ageRange": {
            "type": "select",
            "required": true,
            "options": ["under_18", "18_25", "26_40", "41_55", "over_55", "prefer_not_to_say"],
            "description": "Your age range affects legal protections and risk interpretation"
          }
        }
      }
    },
    "estimatedTime": "5-8 minutes",
    "purpose": "Personalize risk analysis and explanations based on your specific needs and context"
  },
  "metadata": {
    "schema_version": "1.0",
    "last_updated": "2024-01-01",
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

### 6. Delete User Profile

**Endpoint**: `DELETE /api/personalization/profile/{userId}`

**Purpose**: Completely remove user personalization profile.

**Response**:
```json
{
  "success": true,
  "message": "User profile deleted successfully",
  "metadata": {
    "processing_time": 23,
    "deleted_at": "2024-01-15T12:30:00Z"
  }
}
```

### 7. Get Anonymized Statistics

**Endpoint**: `GET /api/personalization/stats`

**Purpose**: Get aggregated, anonymized statistics about personalization usage.

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalProfiles": 1247,
    "demographics": {
      "ageDistribution": {
        "26_40": 432,
        "18_25": 289,
        "41_55": 312,
        "over_55": 156,
        "under_18": 58
      },
      "occupationDistribution": {
        "technology": 298,
        "education": 187,
        "healthcare": 156,
        "student": 234,
        "business_owner": 127
      }
    },
    "preferences": {
      "privacyImportanceDistribution": {
        "extremely_important": 423,
        "very_important": 398,
        "moderately_important": 312,
        "not_very_important": 114
      }
    },
    "riskTolerance": {
      "averagePrivacyTolerance": 4.7,
      "averageFinancialTolerance": 6.2,
      "averageLegalTolerance": 5.9
    }
  },
  "metadata": {
    "anonymized": true,
    "aggregated": true,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

## Data Schemas

### User Personalization Schema Structure

The complete user personalization schema includes four main sections:

#### 1. Demographics
- **ageRange**: Age category affecting legal protections
- **jurisdiction**: Legal jurisdiction information (country, state, travel patterns)
- **occupation**: Professional category affecting risk interpretation

#### 2. Digital Behavior
- **techSophistication**: Technology comfort level and explanation preferences
- **usagePatterns**: Online activity patterns and service usage frequency

#### 3. Risk Preferences
- **privacy**: Privacy importance and data sensitivity preferences
- **financial**: Payment approach and financial risk tolerance
- **legal**: Legal comfort levels and knowledge self-assessment

#### 4. Contextual Factors
- **dependentStatus**: Who is affected by user's decisions
- **specialCircumstances**: Special situations requiring adapted analysis
- **alertPreferences**: Notification and interruption preferences

### Computed Profile Parameters

The system automatically computes several derived parameters:

#### Risk Tolerance Scores (0-10 scale)
- **privacy**: Lower = more privacy-protective
- **financial**: Lower = more budget-protective
- **legal**: Lower = more legally conservative
- **overall**: Averaged across categories

#### Alert Thresholds (0-10 scale)
- **privacy**: When to alert about privacy risks
- **liability**: When to alert about liability issues
- **termination**: When to alert about termination risks
- **payment**: When to alert about payment issues
- **overall**: General alerting threshold

#### Profile Tags
Array of tags used for AI prompt customization:
- Demographic tags: `age_26_40`, `occupation_technology`
- Preference tags: `privacy_very_important`, `payment_cautious`
- Usage tags: `usage_work_productivity`, `tech_advanced`
- Context tags: `dependents_spouse_partner`, `special_handles_sensitive_data`

## Personalization Algorithm

### Risk Tolerance Calculation

The risk tolerance calculation uses weighted factors:

1. **Base Tolerance**: Derived from explicit user preferences
2. **Demographic Adjustments**: Age and occupation-based modifications
3. **Contextual Modifications**: Dependent status and special circumstances
4. **Experience Factors**: Legal knowledge and previous experience

**Formula**:
```
Final Risk Tolerance = Base Tolerance × Age Factor × Occupation Factor × Dependent Factor × Special Circumstance Factor
```

### Alert Threshold Computation

Alert thresholds are inversely related to risk tolerance:

```
Alert Threshold = 10 - Risk Tolerance × Alert Preference Adjustment × Frequency Adjustment
```

### Explanation Style Determination

The system selects explanation style using priority order:

1. **Special Circumstances Override**: Language barriers, vulnerability
2. **User Preference**: Explicit style selection
3. **Occupation Recommendation**: Professional context-appropriate style
4. **Age Recommendation**: Age-appropriate complexity level

### Profile Tag Generation

Profile tags are systematically generated from all user data:

- **Demographic Tags**: Direct mapping from demographic data
- **Preference Tags**: Derived from risk preference selections
- **Behavioral Tags**: Based on usage patterns and tech sophistication
- **Contextual Tags**: From special circumstances and dependencies

## Integration Examples

### Frontend Quiz Implementation

```javascript
// Fetch quiz schema
const response = await fetch('/api/personalization/quiz/schema');
const { schema } = await response.json();

// Build dynamic form based on schema
const quizForm = buildQuizForm(schema);

// Submit completed quiz
const profileData = {
  userId: generateUserId(),
  demographics: formData.demographics,
  digitalBehavior: formData.digitalBehavior,
  riskPreferences: formData.riskPreferences,
  contextualFactors: formData.contextualFactors
};

const saveResponse = await fetch('/api/personalization/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profileData)
});
```

### Analysis Integration

```javascript
// Enhanced analysis with personalization
const analysisResponse = await fetch('/api/v2/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: termsText,
    userId: currentUserId,
    personalized: true,
    context: {
      userProfile: userProfile,
      pageContext: pageContext
    }
  })
});

const { analysis } = await analysisResponse.json();
// Analysis now includes personalized explanations and thresholds
```

### Profile Management

```javascript
// Update user privacy preferences
const updateResponse = await fetch(`/api/personalization/profile/${userId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    section: 'riskPreferences',
    data: {
      privacy: {
        overallImportance: 'extremely_important'
      }
    },
    recomputeProfile: true
  })
});

// Get personalization insights
const insightsResponse = await fetch(`/api/personalization/insights/${userId}`);
const { insights } = await insightsResponse.json();
```

## Error Handling

### Validation Errors (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "demographics.ageRange",
      "message": "Age range is required"
    },
    {
      "field": "riskPreferences.privacy.sensitiveDataTypes",
      "message": "At least one sensitive data type must be specified"
    }
  ],
  "metadata": {
    "processing_time": 12,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

### Profile Not Found (404)

```json
{
  "success": false,
  "error": "User profile not found",
  "metadata": {
    "processing_time": 8,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

### Computation Errors (422)

```json
{
  "success": false,
  "error": "Failed to compute personalization parameters",
  "details": "Risk tolerance calculation failed due to incomplete preference data",
  "metadata": {
    "processing_time": 156,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

### Server Errors (500)

```json
{
  "success": false,
  "error": "Failed to save personalization profile",
  "metadata": {
    "processing_time": 234,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

## Performance Considerations

### Caching Strategy

- **Profile Cache**: Computed profiles cached for 1 hour
- **Schema Cache**: Quiz schema cached indefinitely with versioning
- **Statistics Cache**: Aggregated stats cached for 15 minutes

### Optimization Techniques

1. **Lazy Computation**: Profiles computed only when needed
2. **Incremental Updates**: Partial updates avoid full recomputation
3. **Batch Processing**: Multiple profile operations batched together
4. **Memory Management**: Profiles automatically expired from memory

### Scalability Considerations

- **Database Storage**: Replace in-memory storage with persistent database
- **Profile Partitioning**: Distribute profiles across multiple storage nodes
- **Computation Offloading**: Move complex calculations to background jobs
- **CDN Integration**: Cache static quiz schema and assets

### Performance Targets

- **Profile Save**: <500ms for complete profile submission
- **Profile Retrieval**: <100ms for cached profiles
- **Section Update**: <200ms for partial updates
- **Insights Generation**: <300ms for comprehensive insights

## Security and Privacy

### Data Protection

- **Anonymization**: Statistics completely anonymized
- **Encryption**: Sensitive profile data encrypted at rest
- **Access Control**: Profile access restricted to authenticated users
- **Audit Logging**: All profile operations logged for security monitoring

### Privacy Compliance

- **GDPR Compliance**: Right to deletion and data portability supported
- **Data Minimization**: Only necessary data collected and stored
- **Consent Management**: Clear consent for profile data usage
- **Retention Policies**: Automatic profile expiration and cleanup