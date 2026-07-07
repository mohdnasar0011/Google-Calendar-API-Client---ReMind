package com.app.reMind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ReMindApplication {

	public static void main(String[] args) {
        System.out.println("VERCEL_BASE_URL = " + System.getenv("VERCEL_BASE_URL"));

        SpringApplication.run(ReMindApplication.class, args);
	}

}
