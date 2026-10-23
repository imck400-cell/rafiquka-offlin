# دليل بناء وتغليف تطبيق الأندرويد الأوفلاين (رفيقك المدرسي - Offline APK)

هذا الدليل يوضح الخطوات العملية الكاملة لتحويل النسخة المستقلة (100% Serverless Offline) من نظام **"رفيقك المدرسي"** إلى ملف تطبيق أندرويد قابل للتثبيت المباشر (`.apk`) باستخدام **CapacitorJS 6** و **Android Studio**.

---

## 1. الأوامر الثلاثة الأساسية لتوليد وبناء مشروع الأندرويد

افتح الطرفية (Terminal) في جذر المشروع ونفّذ الأوامر التالية بالترتيب:

```bash
# 1) تثبيت الحزم وبناء نسخة الإنتاج (dist)
npm install
npm run build

# 2) إنشاء مجلد الأندرويد الأصلي ومزامنة ملفات الويب والإضافات
npx cap add android
npx cap sync android

# 3) فتح المشروع مباشرة داخل برنامج Android Studio لبناء الـ APK
npx cap open android
```

> **ملاحظة:** عند إجراء أي تعديل مستقبلي في الكود، يكفي تشغيل الأمر المختصر:
> ```bash
> npm run android:sync
> ```

---

## 2. الإعدادات الإلزامية قبل استخراج ملف الـ APK من Android Studio

### أولاً: ضبط `minSdkVersion = 26`
افتح الملف `android/variables.gradle` (أو `android/app/build.gradle`) وتأكد من ضبط الحد الأدنى لإصدار أندرويد على `26` (Android 8.0+) لضمان التوافق الكامل مع واجهات التشفير القياسية `Web Crypto API` وقاعدة بيانات `IndexedDB`:

```groovy
ext {
    minSdkVersion = 26
    compileSdkVersion = 34
    targetSdkVersion = 34
    // ...
}
```

### ثانياً: تفعيل التوقيع `v1SigningEnabled` و `v2SigningEnabled`
لتفادي رسالة الخطأ الشائعة على بعض الهواتف (*"التطبيق غير مثبت / App not installed"* أو خطأ تحليل الحزمة)، افتح الملف `android/app/build.gradle` وتأكد من تفعيل إصداري التوقيع الأول والثاني داخل قسم `buildTypes` أو `signingConfigs`:

```groovy
android {
    // ...
    defaultConfig {
        applicationId "com.rafiquk.offline"
        minSdkVersion 26
        targetSdkVersion 34
        versionCode 1
        versionName "2.0.0"
    }

    signingConfigs {
        release {
            // بيانات ملف Keystore الخاص بك عند إصدار نسخة النهائية
            v1SigningEnabled true
            v2SigningEnabled true
        }
        debug {
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
        debug {
            signingConfig signingConfigs.debug
        }
    }
}
```

### ثالثاً: إضافة صلاحيات الكاميرا والملفات في `AndroidManifest.xml`
افتح الملف `android/app/src/main/AndroidManifest.xml` وأضف الصلاحيات التالية قبل وسم `<application>` مباشرةً لتمكين:
1. **مسح الباركود البصري (`QR Sync`)** عبر الكاميرا.
2. **استيراد وتصدير ومشاركة حزم الأعمال المشفرة (`.schpack`)** والنسخ الاحتياطية المحلية:

```xml
<!-- صلاحية الكاميرا لميزة المزامنة البصرية QR Sync -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- صلاحيات قراءة وكتابة ملفات الحزم المشفرة (.schpack) والنسخ الاحتياطية -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
```

---

## 3. استخراج ملف الـ APK النهائي

من القائمة العلوية في **Android Studio**:
1. اختر **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)** (أو **Generate Signed Bundle / APK**).
2. بعد انتهاء البناء اضغط على **locate** للوصول إلى ملف `app-debug.apk` أو `app-release.apk` وتوزيعه مباشرة على هواتف المدير والسكرتير والمشرفين والمعلمين.
