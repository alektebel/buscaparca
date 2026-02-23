// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.0.2")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.20")
        classpath("com.google.android.libraries.mapsplatform.secrets-gradle-plugin:secrets-gradle-plugin:2.0.1")
        classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:1.9.20-1.0.14")
    }
}

plugins {
    id("com.android.application") version "8.0.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
    id("com.google.devtools.ksp") version "1.9.20-1.0.14" apply false
}

tasks.register("clean", Delete::class) {
    delete(rootProject.buildDir)
}
