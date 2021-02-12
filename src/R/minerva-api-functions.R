library(tidyverse)
library(httr)
library(jsonlite)

base_url <- "https://air.elixir-luxembourg.org"

login <- function() {
  user <- readline(prompt = "Enter username: ")
  password <- readline(prompt = "Enter password: ")
  
  r <- POST(modify_url(base_url, path = "minerva/api/doLogin"),
            body = list(
              login = user,
              password = password
            ),
            encode = "form")
  
  message(status_code(r))
  
  r
}

logged_in <- login()

list_plugins <- function() {
  if (status_code(logged_in) != 200) {
    message("Please Login!")
  } else {
    r <- GET(modify_url(base_url, path = "minerva/api/plugins/"))
    
    message(status_code(r))
    
    r %>% 
      content("text") %>% 
      fromJSON()
  }
}

plugins <- list_plugins()

access_plugin_information <- function(hash) {
  if (status_code(logged_in) != 200) {
    message("Please Login!")
  } else {
    r <- GET(modify_url(base_url, path = paste0("minerva/api/plugins/", hash)),
             verbose())
    
    message(status_code(r))
    
    r %>% 
      content("text") %>% 
      fromJSON()
  }
}

access_plugin_information(hash)

get_global_plugin_parameter <- function(hash, key) {
  if (status_code(logged_in) != 200) {
    message("Please Login!")
  } else {
    r <- GET(modify_url(base_url, path = paste0("minerva/api/plugins/", hash, "/data/global/", hash)),
             verbose())
    
    message(status_code(r))
    
    r %>% 
      content("text") %>% 
      fromJSON()
  }
}

get_global_plugin_parameter(hash, "allBioEntities")

