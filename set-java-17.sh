#!/bin/bash

echo "========================================="
echo "Setting Java 17 as Default"
echo "========================================="

# Show current Java version
echo "Current Java version:"
java -version
echo ""

# List all Java installations
echo "Available Java versions:"
update-alternatives --list java
echo ""

# Set Java 17 as default (run with sudo)
echo "To set Java 17 as default, run:"
echo "sudo update-alternatives --config java"
echo ""
echo "Then select the number for Java 17 (usually /usr/lib/jvm/java-17-openjdk-amd64/bin/java)"
echo ""

# Alternative: Set for this session only
echo "========================================="
echo "OR set Java 17 for this project only:"
echo "========================================="
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

echo "Java 17 set for this session:"
java -version

echo ""
echo "========================================="
echo "Now you can build the Android app:"
echo "========================================="
echo "cd /home/dachu/Documents/projects/react-native/myHACCPapp"
echo "npx react-native run-android"
echo ""
echo "OR build APK only:"
echo "cd android && ./gradlew assembleDebug"