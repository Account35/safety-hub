-- Prevent duplicate station rows and make national seeding idempotent
CREATE UNIQUE INDEX IF NOT EXISTS police_stations_name_township_key
  ON public.police_stations (name, township);

CREATE INDEX IF NOT EXISTS police_stations_province_idx ON public.police_stations (province);

INSERT INTO public.police_stations (name, address, phone, township, province, is_24_hour, lat, lng) VALUES
-- Gauteng
('Johannesburg Central SAPS','1 Commissioner St, Johannesburg','011 375 5911','Johannesburg Central','Gauteng',true,-26.2044,28.0416),
('Hillbrow SAPS','Cnr Klein & Pretoria St, Hillbrow','011 488 6300','Hillbrow','Gauteng',true,-26.1876,28.0473),
('Sandton SAPS','Cnr Summit & 4th St, Sandton','011 722 4200','Sandton','Gauteng',true,-26.1076,28.0567),
('Soweto Moroka SAPS','Mputhi St, Moroka, Soweto','011 933 6100','Soweto','Gauteng',true,-26.2585,27.8790),
('Orlando SAPS','Mooki St, Orlando East, Soweto','011 936 1000','Orlando East','Gauteng',true,-26.2440,27.9260),
('Tembisa SAPS','Andrew Mapheto Dr, Tembisa','011 928 9000','Tembisa','Gauteng',true,-25.9964,28.2294),
('Pretoria Central SAPS','Cnr Pretorius & Bosman St, Pretoria','012 353 1600','Pretoria Central','Gauteng',true,-25.7479,28.1879),
('Mamelodi SAPS','Tsamaya Ave, Mamelodi','012 841 7600','Mamelodi','Gauteng',true,-25.7060,28.3900),
('Soshanguve SAPS','Block H, Soshanguve','012 799 8000','Soshanguve','Gauteng',true,-25.5300,28.1100),
('Vosloorus SAPS','Mahogany St, Vosloorus','011 906 9000','Vosloorus','Gauteng',true,-26.3400,28.2000),
('Sebokeng SAPS','Moshoeshoe St, Sebokeng','016 590 6000','Sebokeng','Gauteng',true,-26.5800,27.8400),
('Roodepoort SAPS','Cnr Berlandina & Hull St, Roodepoort','011 767 5000','Roodepoort','Gauteng',true,-26.1625,27.8725),
-- Western Cape
('Cape Town Central SAPS','Buitenkant St, Cape Town','021 467 8000','Cape Town Central','Western Cape',true,-33.9280,18.4230),
('Khayelitsha SAPS','Steve Biko Rd, Khayelitsha','021 360 1600','Khayelitsha','Western Cape',true,-34.0350,18.6770),
('Nyanga SAPS','Sithandatu Ave, Nyanga','021 380 3300','Nyanga','Western Cape',true,-33.9880,18.5850),
('Mitchells Plain SAPS','Melkbos Ave, Mitchells Plain','021 370 1600','Mitchells Plain','Western Cape',true,-34.0350,18.6180),
('Wynberg SAPS','Maynard Rd, Wynberg','021 799 8500','Wynberg','Western Cape',true,-34.0060,18.4680),
('Bellville SAPS','Voortrekker Rd, Bellville','021 918 3600','Bellville','Western Cape',true,-33.8990,18.6290),
('George SAPS','Courtenay St, George','044 803 4700','George','Western Cape',true,-33.9630,22.4600),
('Worcester SAPS','Church St, Worcester','023 348 4200','Worcester','Western Cape',true,-33.6460,19.4480),
-- KwaZulu-Natal
('Durban Central SAPS','Stalwart Simelane St, Durban','031 325 4560','Durban Central','KwaZulu-Natal',true,-29.8579,31.0292),
('Umlazi SAPS','Mangosuthu Hwy, Umlazi','031 907 0400','Umlazi','KwaZulu-Natal',true,-29.9660,30.8890),
('KwaMashu SAPS','Bhejane Rd, KwaMashu','031 503 8000','KwaMashu','KwaZulu-Natal',true,-29.7370,30.9740),
('Pietermaritzburg SAPS','Loop St, Pietermaritzburg','033 845 3000','Pietermaritzburg Central','KwaZulu-Natal',true,-29.6000,30.3800),
('Chatsworth SAPS','Higginson Hwy, Chatsworth','031 403 9000','Chatsworth','KwaZulu-Natal',true,-29.9210,30.8760),
('Phoenix SAPS','Phoenix Hwy, Phoenix','031 502 4000','Phoenix','KwaZulu-Natal',true,-29.7000,31.0100),
('Richards Bay SAPS','Kruger Rand Rd, Richards Bay','035 901 4000','Richards Bay','KwaZulu-Natal',true,-28.7800,32.0380),
('Newcastle SAPS','Murchison St, Newcastle','034 328 5000','Newcastle','KwaZulu-Natal',true,-27.7580,29.9320),
-- Eastern Cape
('Port Elizabeth Central SAPS','La Roche Dr, Port Elizabeth','041 394 6000','Port Elizabeth Central','Eastern Cape',true,-33.9600,25.6000),
('Motherwell SAPS','Tyinira St, Motherwell','041 408 7500','Motherwell','Eastern Cape',true,-33.7800,25.5800),
('Mdantsane SAPS','Billie Rd, Mdantsane','043 708 4000','Mdantsane','Eastern Cape',true,-32.9400,27.7300),
('East London SAPS','Fleet St, East London','043 704 2000','East London Central','Eastern Cape',true,-33.0180,27.9040),
('Mthatha SAPS','Madeira St, Mthatha','047 501 5000','Mthatha','Eastern Cape',true,-31.5890,28.7840),
('Queenstown SAPS','Cathcart Rd, Komani','045 808 4200','Queenstown','Eastern Cape',true,-31.8970,26.8770),
-- Free State
('Bloemfontein Central SAPS','Fichardt St, Bloemfontein','051 507 6000','Bloemfontein Central','Free State',true,-29.1200,26.2140),
('Mangaung SAPS','Dr Belcher Rd, Mangaung','051 409 9000','Mangaung','Free State',true,-29.1600,26.2600),
('Welkom SAPS','Buren St, Welkom','057 391 5000','Welkom','Free State',true,-27.9770,26.7350),
('Bethlehem SAPS','Muller St, Bethlehem','058 303 1000','Bethlehem','Free State',true,-28.2300,28.3060),
('Sasolburg SAPS','Fichardt St, Sasolburg','016 973 8000','Sasolburg','Free State',true,-26.8140,27.8170),
-- Mpumalanga
('Mbombela SAPS','Bell St, Mbombela','013 759 1000','Nelspruit Central','Mpumalanga',true,-25.4750,30.9700),
('Witbank SAPS','Botha Ave, eMalahleni','013 655 8000','Witbank','Mpumalanga',true,-25.8770,29.2000),
('Kabokweni SAPS','Main Rd, Kabokweni','013 796 9000','Kabokweni','Mpumalanga',true,-25.3500,31.0800),
('Secunda SAPS','PDP Kruger St, Secunda','017 620 3000','Secunda','Mpumalanga',true,-26.5150,29.2020),
('Ermelo SAPS','Church St, Ermelo','017 801 4000','Ermelo','Mpumalanga',true,-26.5300,29.9800),
-- Limpopo
('Polokwane SAPS','Bodenstein St, Polokwane','015 290 6000','Polokwane Central','Limpopo',true,-23.9000,29.4500),
('Thohoyandou SAPS','Mphephu Dr, Thohoyandou','015 962 8000','Thohoyandou','Limpopo',true,-22.9500,30.4800),
('Seshego SAPS','Zone 2, Seshego','015 223 0000','Seshego','Limpopo',true,-23.8600,29.3600),
('Tzaneen SAPS','Peace St, Tzaneen','015 306 2000','Tzaneen','Limpopo',true,-23.8330,30.1630),
('Mokopane SAPS','Retief St, Mokopane','015 483 3000','Mokopane','Limpopo',true,-24.1940,29.0090),
-- North West
('Rustenburg SAPS','Beyers Naude Dr, Rustenburg','014 590 4000','Rustenburg','North West',true,-25.6670,27.2420),
('Mahikeng SAPS','Shippard St, Mahikeng','018 381 4000','Mahikeng','North West',true,-25.8650,25.6440),
('Klerksdorp SAPS','Boom St, Klerksdorp','018 464 9000','Klerksdorp','North West',true,-26.8520,26.6660),
('Potchefstroom SAPS','Wolmarans St, Potchefstroom','018 299 9000','Potchefstroom','North West',true,-26.7150,27.1000),
('Ikageng SAPS','Ext 3, Ikageng','018 297 9000','Ikageng','North West',true,-26.7400,27.0500),
-- Northern Cape
('Kimberley SAPS','Phakamile Mabija Rd, Kimberley','053 839 4000','Kimberley Central','Northern Cape',true,-28.7380,24.7630),
('Galeshewe SAPS','Rothschild St, Galeshewe','053 830 8000','Galeshewe','Northern Cape',true,-28.7100,24.7400),
('Upington SAPS','Schroder St, Upington','054 337 4000','Upington','Northern Cape',true,-28.4570,21.2560),
('Springbok SAPS','Voortrekker St, Springbok','027 712 8000','Springbok','Northern Cape',true,-29.6640,17.8860),
('De Aar SAPS','Voortrekker St, De Aar','053 632 9000','De Aar','Northern Cape',false,-30.6500,24.0120)
ON CONFLICT (name, township) DO NOTHING;