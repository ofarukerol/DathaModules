// ─── Merkezi Türkiye Coğrafi Verileri ─────────────────────────────────────────

export const ULKELER: string[] = [
    'Türkiye', 'Almanya', 'Hollanda', 'Belçika', 'Avusturya', 'İsviçre', 'Fransa', 'İngiltere',
];

export const ILLER_TR: string[] = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
    'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
    'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
    'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
    'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
    'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
    'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
    'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
    'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
    'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
];

export const ILCELER: Record<string, string[]> = {
    'Adana': [
        'Aladağ', 'Ceyhan', 'Çukurova', 'Feke', 'İmamoğlu',
        'Karaisalı', 'Karataş', 'Kozan', 'Pozantı', 'Saimbeyli',
        'Sarıçam', 'Seyhan', 'Tufanbeyli', 'Yumurtalık', 'Yüreğir',
    ],
    'Adıyaman': [
        'Adıyaman', 'Besni', 'Çelikhan', 'Gerger', 'Gölbaşı',
        'Kahta', 'Samsat', 'Sincik', 'Tut',
    ],
    'Afyonkarahisar': [
        'Afyonkarahisar', 'Başmakçı', 'Bayat', 'Bolvadin', 'Çay',
        'Çobanlar', 'Dazkırı', 'Dinar', 'Emirdağ', 'Evciler',
        'Hocalar', 'İhsaniye', 'İscehisar', 'Kızılören', 'Sandıklı',
        'Sincanlı', 'Sultandağı', 'Şuhut',
    ],
    'Ağrı': [
        'Ağrı', 'Diyadin', 'Doğubayazıt', 'Eleşkirt', 'Hamur',
        'Patnos', 'Taşlıçay', 'Tutak',
    ],
    'Aksaray': [
        'Ağaçören', 'Aksaray', 'Eskil', 'Gülağaç', 'Güzelyurt',
        'Ortaköy', 'Sarıyahşi',
    ],
    'Amasya': [
        'Amasya', 'Göynücek', 'Gümüşhacıköy', 'Hamamözü', 'Merzifon',
        'Suluova', 'Taşova',
    ],
    'Ankara': [
        'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı',
        'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut',
        'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kalecik',
        'Kazan', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan',
        'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle',
    ],
    'Antalya': [
        'Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı',
        'Elmalı', 'Finike', 'Gazipaşa', 'Gündoğmuş', 'İbradı',
        'Kaş', 'Kemer', 'Kepez', 'Konyaaltı', 'Korkuteli',
        'Kumluca', 'Manavgat', 'Muratpaşa', 'Serik',
    ],
    'Ardahan': [
        'Ardahan', 'Çıldır', 'Damal', 'Göle', 'Hanak', 'Posof',
    ],
    'Artvin': [
        'Ardanuç', 'Arhavi', 'Artvin', 'Borçka', 'Hopa',
        'Murgul', 'Şavşat', 'Yusufeli',
    ],
    'Aydın': [
        'Aydın', 'Bozdoğan', 'Buharkent', 'Çine', 'Didim',
        'Germencik', 'İncirliova', 'Karacasu', 'Karpuzlu', 'Koçarlı',
        'Köşk', 'Kuşadası', 'Kuyucak', 'Nazilli', 'Söke',
        'Sultanhisar', 'Yenipazar',
    ],
    'Balıkesir': [
        'Ayvalık', 'Balıkesir', 'Balya', 'Bandırma', 'Bigadiç',
        'Burhaniye', 'Dursunbey', 'Edremit', 'Erdek', 'Gömeç',
        'Gönen', 'Havran', 'İvrindi', 'Kepsut', 'Manyas',
        'Marmara', 'Savaştepe', 'Sındırgı', 'Susurluk',
    ],
    'Bartın': ['Amasra', 'Bartın', 'Kurucaşile', 'Ulus'],
    'Batman': ['Batman', 'Beşiri', 'Gercüş', 'Hasankeyf', 'Kozluk', 'Sason'],
    'Bayburt': ['Aydıntepe', 'Bayburt', 'Demirözü'],
    'Bilecik': [
        'Bilecik', 'Bozüyük', 'Gölpazarı', 'İnhisar', 'Osmaneli',
        'Pazaryeri', 'Söğüt', 'Yenipazar',
    ],
    'Bingöl': [
        'Adaklı', 'Bingöl', 'Genç', 'Karlıova', 'Kiğı',
        'Solhan', 'Yayladere', 'Yedisu',
    ],
    'Bitlis': ['Adilcevaz', 'Ahlat', 'Bitlis', 'Güroymak', 'Hizan', 'Mutki', 'Tatvan'],
    'Bolu': [
        'Bolu', 'Dörtdivan', 'Gerede', 'Göynük', 'Kıbrıscık',
        'Mengen', 'Mudurnu', 'Seben', 'Yeniçağa',
    ],
    'Burdur': [
        'Ağlasun', 'Bucak', 'Burdur', 'Çavdır', 'Çeltikçi',
        'Gölhisar', 'Karamanlı', 'Kemer', 'Tefenni', 'Yeşilova',
    ],
    'Bursa': [
        'Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl',
        'İznik', 'Karacabey', 'Keles', 'Kestel', 'Mudanya',
        'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi',
        'Yenişehir', 'Yıldırım',
    ],
    'Çanakkale': [
        'Ayvacık', 'Bayramiç', 'Biga', 'Bozcaada', 'Çan',
        'Çanakkale', 'Eceabat', 'Ezine', 'Gelibolu', 'Lapseki', 'Yenice',
    ],
    'Çankırı': [
        'Atkaracalar', 'Bayramören', 'Çankırı', 'Çerkeş', 'Eldivan',
        'Ilgaz', 'Kızılırmak', 'Korgun', 'Kurşunlu', 'Orta',
        'Şabanözü', 'Yapraklı',
    ],
    'Çorum': [
        'Alaca', 'Bayat', 'Boğazkale', 'Çorum', 'Dodurga',
        'İskilip', 'Kargı', 'Laçin', 'Mecitözü', 'Oğuzlar',
        'Ortaköy', 'Osmancık', 'Sungurlu', 'Uğurludağ',
    ],
    'Denizli': [
        'Acıpayam', 'Akköy', 'Babadağ', 'Baklan', 'Bekilli',
        'Beyağaç', 'Bozkurt', 'Buldan', 'Çal', 'Çameli',
        'Çardak', 'Çivril', 'Denizli', 'Güney', 'Honaz',
        'Kale', 'Sarayköy', 'Serinhisar', 'Tavas',
    ],
    'Diyarbakır': [
        'Bağlar', 'Bismil', 'Çermik', 'Çınar', 'Çüngüş',
        'Dicle', 'Eğil', 'Ergani', 'Hani', 'Hazro',
        'Kayapınar', 'Kocaköy', 'Kulp', 'Lice', 'Silvan',
        'Sur', 'Yenişehir',
    ],
    'Düzce': [
        'Akçakoca', 'Cumayeri', 'Çilimli', 'Düzce', 'Gölyaka',
        'Gümüşova', 'Kaynaşlı', 'Yığılca',
    ],
    'Edirne': [
        'Edirne', 'Enez', 'Havsa', 'İpsala', 'Keşan',
        'Lalapaşa', 'Meriç', 'Süloğlu', 'Uzunköprü',
    ],
    'Elazığ': [
        'Ağın', 'Alacakaya', 'Arıcak', 'Baskil', 'Elazığ',
        'Karakoçan', 'Keban', 'Kovancılar', 'Maden', 'Palu', 'Sivrice',
    ],
    'Erzincan': [
        'Çayırlı', 'Erzincan', 'Ilıç', 'Kemah', 'Kemaliye',
        'Otlukbeli', 'Refahiye', 'Tercan', 'Üzümlü',
    ],
    'Erzurum': [
        'Aşkale', 'Aziziye', 'Çat', 'Hınıs', 'Horasan',
        'İspir', 'Karaçoban', 'Karayazı', 'Köprüköy', 'Narman',
        'Oltu', 'Olur', 'Palandöken', 'Pasinler', 'Pazaryolu',
        'Şenkaya', 'Tekman', 'Tortum', 'Uzundere', 'Yakutiye',
    ],
    'Eskişehir': [
        'Alpu', 'Beylikova', 'Çifteler', 'Günyüzü', 'Han',
        'İnönü', 'Mahmudiye', 'Mihalgazi', 'Mihalıççık', 'Odunpazarı',
        'Sarıcakaya', 'Seyitgazi', 'Sivrihisar', 'Tepebaşı',
    ],
    'Gaziantep': [
        'Araban', 'İslahiye', 'Karkamış', 'Nizip', 'Nurdağı',
        'Oğuzeli', 'Şahinbey', 'Şehitkamil', 'Yavuzeli',
    ],
    'Giresun': [
        'Alucra', 'Bulancak', 'Çamoluk', 'Çanakçı', 'Dereli',
        'Doğankent', 'Espiye', 'Eynesil', 'Giresun', 'Görele',
        'Güce', 'Keşap', 'Piraziz', 'Şebinkarahisar', 'Tirebolu', 'Yağlıdere',
    ],
    'Gümüşhane': ['Gümüşhane', 'Kelkit', 'Köse', 'Kürtün', 'Şiran', 'Torul'],
    'Hakkari': ['Çukurca', 'Hakkari', 'Şemdinli', 'Yüksekova'],
    'Hatay': [
        'Altınözü', 'Antakya', 'Belen', 'Dörtyol', 'Erzin',
        'Hassa', 'İskenderun', 'Kırıkhan', 'Kumlu', 'Reyhanlı',
        'Samandağ', 'Yayladağı',
    ],
    'Iğdır': ['Aralık', 'Iğdır', 'Karakoyunlu', 'Tuzluca'],
    'Isparta': [
        'Aksu', 'Atabey', 'Eğirdir', 'Gelendost', 'Gönen',
        'Isparta', 'Keçiborlu', 'Senirkent', 'Sütçüler', 'Şarkikaraağaç',
        'Uluborlu', 'Yalvaç', 'Yenişarbademli',
    ],
    'İstanbul': [
        'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar',
        'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş',
        'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca',
        'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih',
        'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal',
        'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
        'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli',
        'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu',
    ],
    'İzmir': [
        'Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama',
        'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli',
        'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar',
        'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz',
        'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş',
        'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla',
    ],
    'Kahramanmaraş': [
        'Afşin', 'Andırın', 'Çağlıyancerit', 'Ekinözü', 'Elbistan',
        'Göksun', 'Kahramanmaraş', 'Nurhak', 'Pazarcık', 'Türkoğlu',
    ],
    'Karabük': ['Eflani', 'Eskipazar', 'Karabük', 'Ovacık', 'Safranbolu', 'Yenice'],
    'Karaman': ['Ayrancı', 'Başyayla', 'Ermenek', 'Karaman', 'Kazımkarabekir', 'Sarıveliler'],
    'Kars': ['Akyaka', 'Arpaçay', 'Digor', 'Kağızman', 'Kars', 'Sarıkamış', 'Selim', 'Susuz'],
    'Kastamonu': [
        'Abana', 'Ağlı', 'Araç', 'Azdavay', 'Bozkurt',
        'Cide', 'Çatalzeytin', 'Daday', 'Devrekani', 'Doğanyurt',
        'Hanönü', 'İhsangazi', 'İnebolu', 'Kastamonu', 'Küre',
        'Pınarbaşı', 'Seydiler', 'Şenpazar', 'Taşköprü', 'Tosya',
    ],
    'Kayseri': [
        'Akkışla', 'Bünyan', 'Develi', 'Felahiye', 'Hacılar',
        'İncesu', 'Kocasinan', 'Melikgazi', 'Özvatan', 'Pınarbaşı',
        'Sarıoğlan', 'Sarız', 'Talas', 'Tomarza', 'Yahyalı', 'Yeşilhisar',
    ],
    'Kırıkkale': [
        'Bahşili', 'Balışeyh', 'Çelebi', 'Delice', 'Karakeçili',
        'Keskin', 'Kırıkkale', 'Sulakyurt', 'Yahşihan',
    ],
    'Kırklareli': [
        'Babaeski', 'Demirköy', 'Kırklareli', 'Kofçaz', 'Lüleburgaz',
        'Pehlivanköy', 'Pınarhisar', 'Vize',
    ],
    'Kırşehir': ['Akçakent', 'Akpınar', 'Boztepe', 'Çiçekdağı', 'Kaman', 'Kırşehir', 'Mucur'],
    'Kilis': ['Elbeyli', 'Kilis', 'Musabeyli', 'Polateli'],
    'Kocaeli': [
        'Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası',
        'Gebze', 'Gölcük', 'İzmit', 'Kandıra', 'Karamürsel',
        'Kartepe', 'Körfez',
    ],
    'Konya': [
        'Ahırlı', 'Akören', 'Akşehir', 'Altınekin', 'Beyşehir',
        'Bozkır', 'Cihanbeyli', 'Çeltik', 'Çumra', 'Derbent',
        'Derebucak', 'Doğanhisar', 'Emirgazi', 'Ereğli', 'Güneysınır',
        'Hadim', 'Halkapınar', 'Hüyük', 'Ilgın', 'Kadınhanı',
        'Karapınar', 'Karatay', 'Kulu', 'Meram', 'Sarayönü',
        'Selçuklu', 'Seydişehir', 'Taşkent', 'Tuzlukçu', 'Yalıhüyük', 'Yunak',
    ],
    'Kütahya': [
        'Altıntaş', 'Aslanapa', 'Çavdarhisar', 'Domaniç', 'Dumlupınar',
        'Emet', 'Gediz', 'Hisarcık', 'Kütahya', 'Pazarlar',
        'Simav', 'Şaphane', 'Tavşanlı',
    ],
    'Malatya': [
        'Akçadağ', 'Arapkir', 'Arguvan', 'Battalgazi', 'Darende',
        'Doğanşehir', 'Doğanyol', 'Hekimhan', 'Kale', 'Kuluncak',
        'Malatya', 'Pütürge', 'Yazıhan', 'Yeşilyurt',
    ],
    'Manisa': [
        'Ahmetli', 'Akhisar', 'Alaşehir', 'Demirci', 'Gölmarmara',
        'Gördes', 'Kırkağaç', 'Köprübaşı', 'Kula', 'Manisa',
        'Salihli', 'Sarıgöl', 'Saruhanlı', 'Selendi', 'Soma', 'Turgutlu',
    ],
    'Mardin': [
        'Dargeçit', 'Derik', 'Kızıltepe', 'Mardin', 'Mazıdağı',
        'Midyat', 'Nusaybin', 'Ömerli', 'Savur', 'Yeşilli',
    ],
    'Mersin': [
        'Akdeniz', 'Anamur', 'Aydıncık', 'Bozyazı', 'Çamlıyayla',
        'Erdemli', 'Gülnar', 'Mezitli', 'Mut', 'Silifke',
        'Tarsus', 'Toroslar', 'Yenişehir',
    ],
    'Muğla': [
        'Bodrum', 'Dalaman', 'Datça', 'Fethiye', 'Kavaklıdere',
        'Köyceğiz', 'Marmaris', 'Milas', 'Muğla', 'Ortaca', 'Ula', 'Yatağan',
    ],
    'Muş': ['Bulanık', 'Hasköy', 'Korkut', 'Malazgirt', 'Muş', 'Varto'],
    'Nevşehir': [
        'Acıgöl', 'Avanos', 'Derinkuyu', 'Gülşehir', 'Hacıbektaş',
        'Kozaklı', 'Nevşehir', 'Ürgüp',
    ],
    'Niğde': ['Altunhisar', 'Bor', 'Çamardı', 'Çiftlik', 'Niğde', 'Ulukışla'],
    'Ordu': [
        'Akkuş', 'Aybastı', 'Çamaş', 'Çatalpınar', 'Çaybaşı',
        'Fatsa', 'Gölköy', 'Gülyalı', 'Gürgentepe', 'İkizce',
        'Kabadüz', 'Kabataş', 'Korgan', 'Kumru', 'Mesudiye',
        'Ordu', 'Perşembe', 'Ulubey', 'Ünye',
    ],
    'Osmaniye': ['Bahçe', 'Düziçi', 'Hasanbeyli', 'Kadirli', 'Osmaniye', 'Sumbas', 'Toprakkale'],
    'Rize': [
        'Ardeşen', 'Çamlıhemşin', 'Çayeli', 'Derepazarı', 'Fındıklı',
        'Güneysu', 'Hemşin', 'İkizdere', 'İyidere', 'Kalkandere', 'Pazar', 'Rize',
    ],
    'Sakarya': [
        'Adapazarı', 'Akyazı', 'Arifiye', 'Erenler', 'Ferizli',
        'Geyve', 'Hendek', 'Karapürçek', 'Karasu', 'Kaynarca',
        'Kocaali', 'Pamukova', 'Sapanca', 'Serdivan', 'Söğütlü', 'Taraklı',
    ],
    'Samsun': [
        'Alaçam', 'Asarcık', 'Atakum', 'Ayvacık', 'Bafra',
        'Canik', 'Çarşamba', 'Havza', 'İlkadım', 'Kavak',
        'Ladik', 'Ondokuzmayıs', 'Salıpazarı', 'Tekkeköy', 'Terme',
        'Vezirköprü', 'Yakakent',
    ],
    'Siirt': ['Aydınlar', 'Baykan', 'Eruh', 'Kurtalan', 'Pervari', 'Siirt', 'Şirvan'],
    'Sinop': ['Ayancık', 'Boyabat', 'Dikmen', 'Durağan', 'Erfelek', 'Gerze', 'Sinop', 'Türkeli'],
    'Sivas': [
        'Akıncılar', 'Altınyayla', 'Divriği', 'Doğanşar', 'Gemerek',
        'Gölova', 'Gürün', 'Hafik', 'İmranlı', 'Kangal',
        'Koyulhisar', 'Sivas', 'Suşehri', 'Şarkışla', 'Ulaş',
        'Yıldızeli', 'Zara',
    ],
    'Şanlıurfa': [
        'Akçakale', 'Birecik', 'Bozova', 'Ceylanpınar', 'Halfeti',
        'Harran', 'Hilvan', 'Siverek', 'Suruç', 'Şanlıurfa', 'Viranşehir',
    ],
    'Şırnak': ['Beytüşşebap', 'Cizre', 'Güçlükonak', 'İdil', 'Silopi', 'Şırnak', 'Uludere'],
    'Tekirdağ': [
        'Çerkezköy', 'Çorlu', 'Hayrabolu', 'Malkara', 'Marmaraereğlisi',
        'Muratlı', 'Saray', 'Şarköy', 'Tekirdağ',
    ],
    'Tokat': [
        'Almus', 'Artova', 'Başçiftlik', 'Erbaa', 'Niksar',
        'Pazar', 'Reşadiye', 'Sulusaray', 'Tokat', 'Turhal',
        'Yeşilyurt', 'Zile',
    ],
    'Trabzon': [
        'Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 'Çarşıbaşı',
        'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 'Köprübaşı',
        'Maçka', 'Of', 'Sürmene', 'Şalpazarı', 'Tonya',
        'Trabzon', 'Vakfıkebir', 'Yomra',
    ],
    'Tunceli': [
        'Çemişgezek', 'Hozat', 'Mazgirt', 'Nazımiye', 'Ovacık',
        'Pertek', 'Pülümür', 'Tunceli',
    ],
    'Uşak': ['Banaz', 'Eşme', 'Karahallı', 'Sivaslı', 'Ulubey', 'Uşak'],
    'Van': [
        'Bahçesaray', 'Başkale', 'Çaldıran', 'Çatak', 'Edremit',
        'Erciş', 'Gevaş', 'Gürpınar', 'Muradiye', 'Özalp', 'Saray', 'Van',
    ],
    'Yalova': ['Altınova', 'Armutlu', 'Çınarcık', 'Çiftlikköy', 'Termal', 'Yalova'],
    'Yozgat': [
        'Akdağmadeni', 'Aydıncık', 'Boğazlıyan', 'Çandır', 'Çayıralan',
        'Çekerek', 'Kadışehri', 'Saraykent', 'Sarıkaya', 'Sorgun',
        'Şefaatli', 'Yenifakılı', 'Yerköy', 'Yozgat',
    ],
    'Zonguldak': ['Alaplı', 'Çaycuma', 'Devrek', 'Gökçebey', 'Karadenizereğli', 'Zonguldak'],
};

export const MAHALLELER: Record<string, string[]> = {
    'Beşiktaş': [
        'Abbasağa Mah.', 'Akatlar Mah.', 'Arnavutköy Mah.', 'Bebek Mah.', 'Cihannüma Mah.',
        'Dikilitaş Mah.', 'Etiler Mah.', 'Gayrettepe Mah.', 'İnkılap Mah.', 'Konaklar Mah.',
        'Kuruçeşme Mah.', 'Levent Mah.', 'Muradiye Mah.', 'Nispetiye Mah.', 'Ortaköy Mah.',
        'Sinanpaşa Mah.', 'Türkali Mah.', 'Ulus Mah.', 'Vişnezade Mah.', 'Yıldız Mah.',
    ],
    'Kadıköy': [
        'Acıbadem Mah.', 'Caferağa Mah.', 'Eğitim Mah.', 'Fenerbahçe Mah.', 'Fikirtepe Mah.',
        'Göztepe Mah.', 'Hasanpaşa Mah.', 'İbrahimağa Mah.', 'Koşuyolu Mah.', 'Kozyatağı Mah.',
        'Moda Mah.', 'Osmanağa Mah.', 'Rasimpaşa Mah.', 'Suadiye Mah.', 'Zühtüpaşa Mah.',
    ],
    'Şişli': [
        '19 Mayıs Mah.', 'Bozkurt Mah.', 'Cumhuriyet Mah.', 'Esentepe Mah.', 'Feriköy Mah.',
        'Fulya Mah.', 'Gülbahar Mah.', 'Halaskargazi Mah.', 'Harbiye Mah.', 'İzzetpaşa Mah.',
        'Kuştepe Mah.', 'Mecidiyeköy Mah.', 'Merkez Mah.', 'Nişantaşı Mah.', 'Teşvikiye Mah.',
    ],
    'Ataşehir': [
        'Atatürk Mah.', 'Aydınlı Mah.', 'Barbaros Mah.', 'Batı Mah.', 'Dumlupınar Mah.',
        'Ferhatpaşa Mah.', 'İçerenköy Mah.', 'İnönü Mah.', 'Kayışdağı Mah.', 'Küçükbakkalköy Mah.',
        'Mevlana Mah.', 'Mustafa Kemal Mah.', 'Örnek Mah.', 'Site Mah.', 'Yenisahra Mah.',
    ],
    'Üsküdar': [
        'Acıbadem Mah.', 'Ahmediye Mah.', 'Altunizade Mah.', 'Bağlarbaşı Mah.',
        'Beylerbeyi Mah.', 'Bulgurlu Mah.', 'Burhaniye Mah.', 'Çengelköy Mah.',
        'Cumhuriyet Mah.', 'Güzeltepe Mah.', 'İcadiye Mah.', 'Kandilli Mah.', 'Kısıklı Mah.',
        'Kuzguncuk Mah.', 'Küçük Çamlıca Mah.', 'Mimar Sinan Mah.', 'Salacak Mah.',
        'Sultantepe Mah.', 'Ünalan Mah.',
    ],
    'Beyoğlu': [
        'Cihangir Mah.', 'Çukurcuma Mah.', 'Galata Mah.', 'Kasımpaşa Mah.',
        'Piyalepaşa Mah.', 'Sütlüce Mah.', 'Tomtom Mah.', 'Bülbül Mah.', 'Örnektepe Mah.',
    ],
    'Sarıyer': [
        'Bahçeköy Mah.', 'Baltalimanı Mah.', 'Büyükdere Mah.', 'Emirgan Mah.',
        'İstinye Mah.', 'Kireçburnu Mah.', 'Maslak Mah.', 'Pınar Mah.',
        'Rumelihisarı Mah.', 'Tarabya Mah.', 'Yeniköy Mah.',
    ],
    'Bakırköy': [
        'Ataköy Mah.', 'Cevizlik Mah.', 'İncirli Mah.', 'Kartaltepe Mah.',
        'Osmaniye Mah.', 'Sakızağacı Mah.', 'Zeytinlik Mah.',
    ],
    'Fatih': [
        'Akşemsettin Mah.', 'Atikali Mah.', 'Bali Paşa Mah.', 'Çarşamba Mah.',
        'Davutpaşa Mah.', 'Edirnekapı Mah.', 'Emin Sinan Mah.', 'Karagümrük Mah.',
        'Koca Mustafa Paşa Mah.', 'Mesih Paşa Mah.', 'Süleymaniye Mah.',
    ],
    'Maltepe': [
        'Altıntepe Mah.', 'Aydınevler Mah.', 'Bağlarbaşı Mah.', 'Başıbüyük Mah.',
        'Cevizli Mah.', 'Esenyalı Mah.', 'Feyzullah Mah.', 'Gülsuyu Mah.',
        'Gülensu Mah.', 'İdealtepe Mah.', 'Küçükyalı Mah.', 'Zümrütevler Mah.',
    ],
    'Çankaya': [
        'Aşağı Ayrancı Mah.', 'Bahçelievler Mah.', 'Birlik Mah.', 'Çankaya Mah.',
        'Emek Mah.', 'Kızılay Mah.', 'Maltepe Mah.', 'Öveçler Mah.',
        'Tunalı Hilmi Mah.', 'Yenimahalle Mah.',
    ],
    'Keçiören': [
        'Aktepe Mah.', 'Bağlum Mah.', 'Cumhuriyet Mah.', 'Demetevler Mah.',
        'Etlik Mah.', 'Kalaba Mah.', 'Kuşcağız Mah.', 'Ovacık Mah.',
    ],
    'Konak': [
        'Alsancak Mah.', 'Basmane Mah.', 'Çankaya Mah.', 'Fevzipaşa Mah.',
        'Gültepe Mah.', 'Hatay Mah.', 'Kahramanlar Mah.', 'Mithatpaşa Mah.',
    ],
    'Nilüfer': [
        'Beşevler Mah.', 'Değirmenköy Mah.', 'Fethiye Mah.', 'Görükle Mah.',
        'Hasanağa Mah.', 'Konak Mah.', 'Özlüce Mah.', 'Şahintepe Mah.',
    ],
};

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

export const getIlceler = (il: string): string[] => ILCELER[il] || [];

export const getMahalleler = (ilce: string): string[] => MAHALLELER[ilce] || [];

/** İlçeye göre mahalleleri SQLite'dan çeker, yoksa statik veriye fallback yapar */
export const getMahallelerAsync = async (ilce: string): Promise<string[]> => {
    try {
        const { getReadyDb } = await import('../../../services/db');
        const db = await getReadyDb();
        if (db) {
            const rows = await db.select<{ mahalle: string }[]>(
                'SELECT mahalle FROM mahalleler WHERE ilce = $1 ORDER BY mahalle COLLATE NOCASE',
                [ilce]
            );
            if (rows.length > 0) return rows.map(r => r.mahalle);
        }
    } catch {
        /* DB unavailable — fallback */
    }
    return MAHALLELER[ilce] || [];
};

export const sortByHistory = (items: string[], history: string[]): string[] => {
    const inHistory = history.filter(h => items.includes(h));
    const rest = items.filter(i => !history.includes(i)).sort((a, b) =>
        a.localeCompare(b, 'tr')
    );
    return [...inHistory, ...rest];
};
