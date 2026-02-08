--
-- PostgreSQL database dump
--

\restrict fWqYr26NypQNC4F4Q6J9G0NJldRnoy9wkf5SGQ36NTgsEIYBhedIQCQIw1rfe8n

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 18.0

-- Started on 2026-02-08 18:05:47

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 16385)
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- TOC entry 3782 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- TOC entry 1054 (class 1247 OID 17042)
-- Name: booking_status; Type: TYPE; Schema: public; Owner: campus_user
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'canceled',
    'completed'
);


ALTER TYPE public.booking_status OWNER TO campus_user;

--
-- TOC entry 1051 (class 1247 OID 17036)
-- Name: user_role; Type: TYPE; Schema: public; Owner: campus_user
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin'
);


ALTER TYPE public.user_role OWNER TO campus_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 17078)
-- Name: bookings; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    facility_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    updated_by uuid,
    deleted_by uuid,
    deleted_at timestamp with time zone,
    purpose text DEFAULT 'Kegiatan Mahasiswa'::text,
    ticket_code character varying(255),
    is_checked_in boolean DEFAULT false,
    checked_in_at timestamp with time zone,
    is_checked_out boolean DEFAULT false,
    checked_out_at timestamp with time zone,
    checkout_status character varying(20),
    actual_end_time timestamp with time zone,
    attendance_status character varying(20),
    review_comment text,
    reviewed_at timestamp with time zone,
    CONSTRAINT bookings_check CHECK ((start_time < end_time))
);


ALTER TABLE public.bookings OWNER TO campus_user;

--
-- TOC entry 3783 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.checkout_status; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.checkout_status IS 'on_time = tepat waktu, late = terlambat';


--
-- TOC entry 3784 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.actual_end_time; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.actual_end_time IS 'Waktu aktual user scan check-out atau auto check-out sistem';


--
-- TOC entry 3785 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.attendance_status; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.attendance_status IS 'on_time = tepat waktu, late = terlambat, no_show = mangkir';


--
-- TOC entry 3786 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.review_comment; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.review_comment IS 'Komentar ulasan dari user terkait fasilitas setelah status completed';


--
-- TOC entry 3787 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.reviewed_at; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.reviewed_at IS 'Waktu saat user memberikan atau memperbarui ulasan';


--
-- TOC entry 217 (class 1259 OID 17064)
-- Name: facilities; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    capacity integer NOT NULL,
    price numeric(12,2),
    photo_url text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    updated_by uuid,
    deleted_by uuid,
    deleted_at timestamp with time zone,
    description text,
    location character varying(255),
    CONSTRAINT facilities_capacity_check CHECK ((capacity > 0))
);


ALTER TABLE public.facilities OWNER TO campus_user;

--
-- TOC entry 219 (class 1259 OID 41680)
-- Name: profiles; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name character varying(150),
    phone_number character varying(20),
    address text,
    avatar_url text,
    gender character varying(1),
    identity_number character varying(50),
    department character varying(100),
    "position" character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT profiles_gender_check CHECK (((gender)::text = ANY ((ARRAY['L'::character varying, 'P'::character varying])::text[])))
);


ALTER TABLE public.profiles OWNER TO campus_user;

--
-- TOC entry 216 (class 1259 OID 17051)
-- Name: users; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_by uuid,
    deleted_at timestamp with time zone,
    phone character varying(20),
    is_phone_verified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO campus_user;

--
-- TOC entry 220 (class 1259 OID 99024)
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number character varying(20) NOT NULL,
    code character varying(10) NOT NULL,
    type character varying(20) NOT NULL,
    expiration_time timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone
);


ALTER TABLE public.verification_codes OWNER TO campus_user;

--
-- TOC entry 3774 (class 0 OID 17078)
-- Dependencies: 218
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.bookings (id, user_id, facility_id, start_time, end_time, status, rejection_reason, created_at, updated_at, created_by, updated_by, deleted_by, deleted_at, purpose, ticket_code, is_checked_in, checked_in_at, is_checked_out, checked_out_at, checkout_status, actual_end_time, attendance_status, review_comment, reviewed_at) FROM stdin;
7e697495-ac3a-4923-a38c-ff43fcad78e2	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	d76ca801-d61a-492e-9a91-09a6053eec40	2026-01-29 04:56:00+00	2026-01-29 06:07:00+00	rejected	\N	2026-01-29 04:56:24.079472+00	2026-01-29 04:57:05.686845+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N			f	\N	f	\N	\N	\N	\N	\N	\N
8234967f-7ffb-47ff-9dc6-179403371abe	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	d76ca801-d61a-492e-9a91-09a6053eec40	2026-01-29 05:05:00+00	2026-01-29 07:15:00+00	rejected	tes	2026-01-29 05:05:30.512183+00	2026-01-29 05:12:26.166855+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
8740fe12-b0d0-417a-85ed-4be1212391c8	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	8b6dd75a-f94d-4088-b6a1-c8595273fcc7	2026-01-29 05:12:00+00	2026-01-29 06:23:00+00	rejected	\N	2026-01-29 05:13:07.338181+00	2026-01-29 05:13:15.34787+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
610e4bda-e381-4351-900f-a4e0e54836c9	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	8b6dd75a-f94d-4088-b6a1-c8595273fcc7	2026-01-29 06:15:00+00	2026-01-29 07:25:00+00	rejected	tes	2026-01-29 06:15:43.713651+00	2026-01-29 06:16:06.690991+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
2b5ed930-b31e-4873-8fba-02e3c472402f	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	d76ca801-d61a-492e-9a91-09a6053eec40	2026-01-29 06:16:00+00	2026-01-29 07:27:00+00	rejected	\N	2026-01-29 06:16:38.158531+00	2026-01-29 06:16:51.777548+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
80e2c47b-ce28-445e-bb52-981907342abb	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	d76ca801-d61a-492e-9a91-09a6053eec40	2026-01-29 01:35:00+00	2026-01-29 03:48:00+00	completed	\N	2026-01-29 03:36:10.803314+00	2026-01-29 03:36:27.038729+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260129-IXKD3	t	2026-01-29 03:37:00.808246+00	t	2026-01-29 03:37:22.372546+00	\N	2026-01-29 03:37:22.372546+00	on_time	kipas rusak tes	2026-01-29 07:04:02.71466+00
96764cba-8ecb-4c2e-b635-0bc1ba51da15	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	d76ca801-d61a-492e-9a91-09a6053eec40	2026-01-29 07:06:00+00	2026-01-29 08:17:00+00	pending	\N	2026-01-29 07:06:23.936274+00	2026-01-29 07:06:23.936274+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	\N	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
d7b9fe78-fa82-410b-a7cb-2edc24ba6c8f	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	d76ca801-d61a-492e-9a91-09a6053eec40	2026-01-29 10:09:00+00	2026-01-29 12:21:00+00	rejected	TES	2026-01-29 07:07:00.720421+00	2026-01-29 07:46:49.963951+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
346cb833-a13c-4a41-acf3-00f7e7c0f4a1	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	d76ca801-d61a-492e-9a91-09a6053eec40	2026-01-29 01:33:00+00	2026-01-29 03:35:00+00	completed	\N	2026-01-29 03:30:17.786877+00	2026-01-29 03:30:36.112336+00	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260129-9GRHW	t	2026-01-29 03:31:09.626069+00	t	2026-01-29 03:35:04.743007+00	\N	2026-01-29 03:35:04.743007+00	late	TES	2026-01-29 07:47:57.77729+00
1d23b4cb-e67c-470b-a140-c0af40e5def8	4fca815d-2f3d-4068-8b49-c57a3aa95e70	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-09 10:36:00+00	2026-02-09 11:46:00+00	canceled	User Account Deleted	2026-02-08 10:36:15.998353+00	2026-02-08 10:36:50.700207+00	4fca815d-2f3d-4068-8b49-c57a3aa95e70	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
\.


--
-- TOC entry 3773 (class 0 OID 17064)
-- Dependencies: 217
-- Data for Name: facilities; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.facilities (id, name, capacity, price, photo_url, is_active, created_at, updated_at, created_by, updated_by, deleted_by, deleted_at, description, location) FROM stdin;
8b6dd75a-f94d-4088-b6a1-c8595273fcc7	Auditorium	500	0.00	{/uploads/1769398781-0-audit1.jpg,/uploads/1769398781-1-audit2.jpg,/uploads/1769398781-2-audit3.jpg,/uploads/1769398781-3-audit4.jpg}	t	2026-01-26 03:26:20.488521+00	2026-01-26 03:39:41.06618+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruangan aula besar dengan kapasitas 500 kursi, dilengkapi sistem tata suara dolby, proyektor ganda, dan panggung utama. Biasa digunakan untuk seminar umum, kuliah tamu, dan acara wisuda fakultas.	Gedung A Lantai 1
1b76fdda-104b-4471-9e58-52dab1be681f	Laboratorium Komputer	50	0.00	{/uploads/1769398980-0-lab1.jpg}	t	2026-01-26 03:27:55.010864+00	2026-01-26 03:43:00.403828+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruang praktikum yang berisi 40 unit PC spesifikasi tinggi (i7, 32GB RAM) dengan jaringan LAN gigabit. Dikhususkan untuk mata kuliah pemrograman, desain grafis, dan data mining.	Gedung B Lantai 2
a623e819-6519-4092-b7b2-277921aa9230	Ruang Diskusi Perpustakaan	6	0.00	{/uploads/1769399160-0-perpus.jpg}	t	2026-01-26 03:30:08.685814+00	2026-01-26 03:46:00.354383+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruangan kedap suara berkapasitas 6 orang yang terletak di lantai 2 perpustakaan. Dilengkapi dengan whiteboard, meja bundar, dan saklar listrik, cocok untuk kerja kelompok atau bimbingan skripsi.	Gedung C Lantai 3
d76ca801-d61a-492e-9a91-09a6053eec40	Workshop Mesin Dasar	47	0.00	{/uploads/1769399432-0-mesin.jpg,"/uploads/1769399432-1-unnamed (1).jpg"}	t	2026-01-26 03:33:04.581878+00	2026-01-29 03:26:05.434404+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruang bengkel luas dengan atap tinggi yang menampung mesin bubut, mesin bor duduk, dan area pengelasan. Wajib menggunakan APD (Alat Pelindung Diri) lengkap saat memasuki area ini.	Gedung D lantai 1
\.


--
-- TOC entry 3775 (class 0 OID 41680)
-- Dependencies: 219
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.profiles (id, user_id, full_name, phone_number, address, avatar_url, gender, identity_number, department, "position", created_at, updated_at) FROM stdin;
edaf49e2-e7e8-4644-9ec3-1f72605fe38a	7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	sukoco praktono 	089999999	terra	/uploads/1769397701-avatar.jfif	L	22110011	teknik informatika	mahasiswa	2026-01-26 03:19:03.648376	2026-01-26 03:21:41.092764
d9541cb6-6be1-45fc-8ae8-ebf124162d37	28909ba3-83bb-4d5f-bb88-b82952cd0bc6	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-26 03:35:21.047656	2026-01-26 03:35:21.047656
3707ca58-9bd6-4f60-a328-4767f1ea678f	9985b1a8-12ef-481f-81dc-92b81fb940ce	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-08 10:11:33.267136	2026-02-08 10:34:57.851751
cdb27b46-9cc5-4e4b-91f7-50a0ea041655	4fca815d-2f3d-4068-8b49-c57a3aa95e70	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-08 10:34:41.25342	2026-02-08 10:36:50.700207
381ab347-0a94-45d9-a041-52d9fd6d8199	f3e6d806-ab85-40c8-beba-4719d2c7880f	wxwxwx			/uploads/1770547439-avatar.png	L	sxwxwx	xwxwxwx	wxwwxwe	2026-02-08 10:37:42.596965	2026-02-08 10:43:59.198733
\.


--
-- TOC entry 3772 (class 0 OID 17051)
-- Dependencies: 216
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.users (id, name, email, password_hash, role, created_at, updated_at, created_by, updated_by, deleted_by, deleted_at, phone, is_phone_verified) FROM stdin;
0b246bff-7316-4a63-81e0-eded4008a58d	admin	admin@admin.com	$2a$10$2p73INV.IiFeNnc4BPmwk.YoIjFD16EDlPolroLlmlPTqrvKRyQty	admin	2026-01-22 09:23:55.959548+00	2026-01-22 09:23:55.959548+00	\N	\N	\N	\N	\N	f
9985b1a8-12ef-481f-81dc-92b81fb940ce	tes101 (Deleted 1770546898)	ceryover@gmail.com.deleted_1770546898	$2a$10$bdilpQWP9C464NwcwOrn8e2e96o/4exKs3yrmdKiN30SzS0QD6Tf2	user	2026-02-08 10:11:33.26041+00	2026-02-08 10:11:33.26041+00	\N	\N	0b246bff-7316-4a63-81e0-eded4008a58d	2026-02-08 10:34:57.851751+00	\N	f
4fca815d-2f3d-4068-8b49-c57a3aa95e70	tes12 (Deleted 1770547011)	tes12@gmail.com.deleted_1770547011	$2a$10$2eS5lvgX3ji.s9MXYofNmeatHW45ycGng7mlcpw3Z7vr51dRmVYta	user	2026-02-08 10:34:41.246456+00	2026-02-08 10:34:41.246456+00	\N	\N	0b246bff-7316-4a63-81e0-eded4008a58d	2026-02-08 10:36:50.700207+00	\N	f
f3e6d806-ab85-40c8-beba-4719d2c7880f	tes12	tes12@gmail.com	$2a$10$FA2whgfQRRUv3u7/C1AZqOIXQc7l7txOGWwgpY5EKKI./ePvbWlTW	user	2026-02-08 10:37:42.587956+00	2026-02-08 10:37:42.587956+00	\N	\N	\N	\N	\N	f
28909ba3-83bb-4d5f-bb88-b82952cd0bc6	user2	user2@test.com	$2a$10$NlocMMBJPPcN7SICAFBjku7NgY4CO8yJS7F7TkmOlh/ksUTSeEXpm	user	2026-01-26 03:35:21.037401+00	2026-01-26 03:35:21.037401+00	\N	\N	\N	\N	\N	f
7ba561b5-d92a-41b7-9ab8-5c8b100a6c37	user1	tes1@gmail.com	$2a$10$VAslhs8oOSc5xiqI59014.76MrWKbxQfH8yJl.o10i6NFc8gp8kHK	user	2026-01-26 03:19:03.642202+00	2026-02-08 07:25:05.151228+00	\N	\N	\N	\N	089999999	f
\.


--
-- TOC entry 3776 (class 0 OID 99024)
-- Dependencies: 220
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.verification_codes (id, phone_number, code, type, expiration_time, created_at, used_at) FROM stdin;
fa391554-2a9b-4441-9cc0-adb31a205b94	08	389153	register	2026-02-03 09:02:42.198125+00	2026-02-03 08:57:42.198125+00	\N
bcc304f1-6ae8-4fb9-a9c4-e151061cc2f3	089617540306	884327	register	2026-02-03 09:15:29.468345+00	2026-02-03 09:10:29.468345+00	\N
3aee1760-df16-4584-9a8f-c1f03ee4bbce	8u98798989080	280095	register	2026-02-04 02:41:41.032542+00	2026-02-04 02:36:41.032542+00	\N
321bc21e-7c05-4545-b2ba-a39e51b03467	dsxdsxdsx	419174	register	2026-02-08 05:00:01.034232+00	2026-02-08 04:55:01.034232+00	\N
3cc4f0c3-5cb3-4356-af35-120ef2cb9287	jnjnmkmkmk	740719	register	2026-02-08 05:03:17.444573+00	2026-02-08 04:58:17.444573+00	\N
1a79e287-01fe-4f36-a681-2a5f16eb4329	jknjknjm	340945	register	2026-02-08 05:18:06.011123+00	2026-02-08 05:13:06.011123+00	\N
85be0135-b4ae-4b98-9c39-17cd76406417	1234567890	238720	register	2026-02-08 05:36:29.261259+00	2026-02-08 05:31:29.261259+00	\N
51cd93e7-1e17-4a8d-8f9f-984111641c76	087790239132	208205	register	2026-02-08 08:44:29.42026+00	2026-02-08 08:39:29.42026+00	\N
\.


--
-- TOC entry 3598 (class 2606 OID 17089)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 3600 (class 2606 OID 66272)
-- Name: bookings bookings_ticket_code_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_ticket_code_key UNIQUE (ticket_code);


--
-- TOC entry 3593 (class 2606 OID 17077)
-- Name: facilities facilities_name_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_name_key UNIQUE (name);


--
-- TOC entry 3595 (class 2606 OID 17075)
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- TOC entry 3607 (class 2606 OID 74450)
-- Name: bookings no_double_booking; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT no_double_booking EXCLUDE USING gist (facility_id WITH =, tstzrange(start_time, COALESCE(actual_end_time, end_time)) WITH &&) WHERE (((status = ANY (ARRAY['pending'::public.booking_status, 'approved'::public.booking_status])) AND (deleted_at IS NULL)));


--
-- TOC entry 3609 (class 2606 OID 41699)
-- Name: bookings no_user_overlap; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT no_user_overlap EXCLUDE USING gist (user_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE (((status = ANY (ARRAY['pending'::public.booking_status, 'approved'::public.booking_status])) AND (deleted_at IS NULL)));


--
-- TOC entry 3611 (class 2606 OID 41690)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3613 (class 2606 OID 41692)
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 3585 (class 2606 OID 17063)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3587 (class 2606 OID 107217)
-- Name: users users_name_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_name_key UNIQUE (name);


--
-- TOC entry 3589 (class 2606 OID 99034)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 3591 (class 2606 OID 17061)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3616 (class 2606 OID 99030)
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 3601 (class 1259 OID 74451)
-- Name: idx_bookings_auto_checkout; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_auto_checkout ON public.bookings USING btree (status, is_checked_in, is_checked_out, end_time) WHERE (status = 'approved'::public.booking_status);


--
-- TOC entry 3602 (class 1259 OID 25341)
-- Name: idx_bookings_created_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_created_by ON public.bookings USING btree (created_by);


--
-- TOC entry 3603 (class 1259 OID 25343)
-- Name: idx_bookings_deleted_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_deleted_by ON public.bookings USING btree (deleted_by);


--
-- TOC entry 3604 (class 1259 OID 66273)
-- Name: idx_bookings_ticket_code; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_ticket_code ON public.bookings USING btree (ticket_code);


--
-- TOC entry 3605 (class 1259 OID 25342)
-- Name: idx_bookings_updated_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_updated_by ON public.bookings USING btree (updated_by);


--
-- TOC entry 3596 (class 1259 OID 25344)
-- Name: idx_facilities_created_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_facilities_created_by ON public.facilities USING btree (created_by);


--
-- TOC entry 3614 (class 1259 OID 99031)
-- Name: idx_verification_codes_phone; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_verification_codes_phone ON public.verification_codes USING btree (phone_number);


--
-- TOC entry 3623 (class 2606 OID 25326)
-- Name: bookings bookings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3624 (class 2606 OID 25336)
-- Name: bookings bookings_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- TOC entry 3625 (class 2606 OID 17095)
-- Name: bookings bookings_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- TOC entry 3626 (class 2606 OID 25331)
-- Name: bookings bookings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3627 (class 2606 OID 17090)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3620 (class 2606 OID 25311)
-- Name: facilities facilities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3621 (class 2606 OID 25321)
-- Name: facilities facilities_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- TOC entry 3622 (class 2606 OID 25316)
-- Name: facilities facilities_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3628 (class 2606 OID 41693)
-- Name: profiles fk_user; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3617 (class 2606 OID 25296)
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3618 (class 2606 OID 25306)
-- Name: users users_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- TOC entry 3619 (class 2606 OID 25301)
-- Name: users users_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


-- Completed on 2026-02-08 18:05:48

--
-- PostgreSQL database dump complete
--

\unrestrict fWqYr26NypQNC4F4Q6J9G0NJldRnoy9wkf5SGQ36NTgsEIYBhedIQCQIw1rfe8n

