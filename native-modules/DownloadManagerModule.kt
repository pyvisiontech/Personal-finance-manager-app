package com.rajaramsingh.personalfinancetracker

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.provider.DocumentsContract
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream

class DownloadManagerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var saveFilePromise: Promise? = null
    private var tempFileUri: String? = null

    private val activityEventListener: ActivityEventListener = object : ActivityEventListener {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == REQUEST_CODE_SAVE_FILE) {
                val promise = saveFilePromise
                val tempUri = tempFileUri

                saveFilePromise = null
                tempFileUri = null

                if (resultCode == Activity.RESULT_OK && data != null && data.data != null) {
                    val destinationUri = data.data!!
                    try {
                        if (tempUri == null) {
                            promise?.reject("FILE_NOT_FOUND", "Source file URI is null")
                            return
                        }
                        
                        val sourceFile = File(tempUri)
                        if (!sourceFile.exists()) {
                            promise?.reject("FILE_NOT_FOUND", "Source file does not exist")
                            return
                        }

                        val resolver = reactApplicationContext.contentResolver
                        val outputStream = resolver.openOutputStream(destinationUri)
                        if (outputStream == null) {
                            promise?.reject("SAVE_ERROR", "Failed to open output stream")
                            return
                        }
                        
                        outputStream.use { output ->
                            FileInputStream(sourceFile).use { input ->
                                input.copyTo(output)
                            }
                        }

                        // Delete temporary file
                        sourceFile.delete()

                        promise?.resolve(destinationUri.toString())
                    } catch (e: Exception) {
                        promise?.reject("SAVE_ERROR", "Failed to save file: ${e.message}", e)
                    }
                } else {
                    promise?.reject("USER_CANCELLED", "User cancelled file save")
                }
            }
        }
    }

    init {
        reactApplicationContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String {
        return "DownloadManagerModule"
    }

    @ReactMethod
    fun saveFileWithPicker(fileUri: String, fileName: String, promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }

        val sourceFile = File(fileUri)
        if (!sourceFile.exists()) {
            promise.reject("FILE_NOT_FOUND", "Source file does not exist: $fileUri")
            return
        }

        saveFilePromise = promise
        tempFileUri = fileUri

        try {
            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                putExtra(Intent.EXTRA_TITLE, fileName)
                
                // For Android 10+ (API 29+), we can use MediaStore
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    putExtra(DocumentsContract.EXTRA_INITIAL_URI, 
                        android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI)
                }
            }

            @Suppress("DEPRECATION")
            activity.startActivityForResult(intent, REQUEST_CODE_SAVE_FILE)
        } catch (e: Exception) {
            saveFilePromise = null
            tempFileUri = null
            promise.reject("INTENT_ERROR", "Failed to open file picker: ${e.message}", e)
        }
    }

    companion object {
        private const val REQUEST_CODE_SAVE_FILE = 1001
    }
}
